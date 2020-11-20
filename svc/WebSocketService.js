/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistService, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {action, observable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {throwIf} from '@xh/hoist/utils/js';
import {find, pull} from 'lodash';

/**
 * Establishes and maintains a websocket connection to the Hoist server, if enabled via `AppSpec`.
 *
 * Once a connection is established, this service exposes a `channelKey` property that is unique to
 * this user and client app instance. This key can be used in application-specific requests to the
 * server to identify this unique client app instance / connection. The server can then push
 * messages as requested - e.g. when a particular query or dataset of interest is updated.
 *
 * Callers can register a callback via `subscribe()` to receive incoming messages on a requested
 * topic. The {@see WebSocketSubscription} returned from `subscribe()` can be used to later
 * `unsubscribe()` if updates are no longer desired. `HoistModel` and `HoistComponent` callers are
 * encouraged to save a reference to their subscription via a {@see managed} property to have
 * callbacks unsubscribed automatically when the component/model is unmounted/destroyed.
 *
 * This service also provides a `sendMessage()` method to push messages back to the server over the
 * same socket, although this is a relatively uncommon usage and is specifically *not* recommended
 * over plain-old Ajax requests.
 *
 * Note this service requires the server-side application to be configured to listen to inbound
 * websocket connections. See `WebSocketService.groovy` in hoist-core for additional documentation.
 *
 * Also {@see WebSocketIndicator}, a simple component for visually displaying connection status.
 */
export class WebSocketService extends HoistService {

    HEARTBEAT_TOPIC = 'xhHeartbeat';
    REG_SUCCESS_TOPIC = 'xhRegistrationSuccess';
    TEST_MSG_TOPIC = 'xhTestMessage';

    /** @property {string} - unique channel assigned by server upon successful connection. */
    @observable channelKey = null;

    /** @property {Date} - Last time a message was received, including heartbeat messages. */
    @observable lastMessageTime = null;

    /** @property {boolean} - Observable flag indicating service is connected and available for use. */
    get connected() {return !!this.channelKey}

    /** @property {boolean} - set to true to log all sent/received messages - very chatty. */
    logMessages = false;

    _timer;
    _socket;
    _subsByTopic = {};

    get enabled() {return XH.appSpec.webSocketsEnabled}

    async initAsync() {
        if (!this.enabled) return;

        this.connect();

        this._timer = Timer.create({
            runFn: () => this.heartbeatOrReconnect(),
            interval: 10 * SECONDS,
            delay: true
        });
    }

    /**
     * Subscribe a callback to receive inbound messages for a given topic on a going-forward basis.
     *
     * @param {string} topic - application-specific topic of interest.
     * @param {function} fn - handler to call for each incoming message on the requested topic.
     *      Will be called with a object of the form {@see WebSocketMessage}.
     * @returns {WebSocketSubscription} - subscription reference that can be used to unsubscribe
     *      to future messages for the same topic/handler. Callers should take care to save this
     *      reference and use it to cleanup their subs on destroy.
     */
    subscribe(topic, fn) {
        const subs = this.getSubsForTopic(topic),
            existingSub = find(subs, {fn});

        if (existingSub) return existingSub;

        const newSub = new WebSocketSubscription(topic, fn);
        subs.push(newSub);
        return newSub;
    }

    /**
     * Cancel a subscription for a given topic/handler.
     *
     * @param {WebSocketSubscription} subscription - the object returned by `subscribe()` when the
     *      subscription was initially established.
     */
    unsubscribe(subscription) {
        const subs = this.getSubsForTopic(subscription.topic);
        pull(subs, subscription);
    }

    /**
     * Send a message back to the server via the connected websocket.
     * @param {WebSocketMessage} message
     */
    sendMessage(message) {
        this.updateConnectedStatus();
        throwIf(!this.connected, 'Unable to send message via websocket - not connected.');

        this._socket.send(JSON.stringify(message));
        this.maybeLogMessage('Sent message', message);
    }


    //------------------------
    // Implementation
    //------------------------
    connect() {
        try {
            // Create new socket and wire up events.  Be sure to ignore obsolete sockets
            const s = new WebSocket(this.buildWebSocketUrl());
            s.onopen = (ev) => {if (s === this._socket) this.onOpen(ev);};
            s.onclose = (ev) => {if (s === this._socket) this.onClose(ev);};
            s.onerror = (ev) => {if (s === this._socket) this.onError(ev);};
            s.onmessage = (data) => {if (s === this._socket) this.onMessage(data);};
            this._socket = s;
        } catch (e) {
            console.error('Failure creating WebSocket in WebSocketService', e);
        }

        this.updateConnectedStatus();
    }

    disconnect() {
        if (this._socket) {
            this._socket.close();
            this._socket = null;
        }
        this.updateConnectedStatus();
    }

    heartbeatOrReconnect() {
        this.updateConnectedStatus();
        if (this.connected) {
            this.sendMessage({topic: this.HEARTBEAT_TOPIC, data: 'ping'});
        } else {
            console.warn('Heartbeat found websocket not connected - attempting to reconnect.');
            this.disconnect();
            this.connect();
        }
    }

    shutdown() {
        if (this._timer) this._timer.cancel();
        this.disconnect();
    }

    //------------------------
    // Socket events impl
    //------------------------
    onOpen(ev) {
        console.debug('WebSocket connection opened', ev);
        this.updateConnectedStatus();
    }

    onClose(ev) {
        console.debug('WebSocket connection closed', ev);
        this.updateConnectedStatus();
    }

    onError(ev) {
        console.error('WebSocket connection error', ev);
        this.updateConnectedStatus();
    }

    onMessage(rawMsg) {
        try {
            const msg = JSON.parse(rawMsg.data),
                {topic, data} = msg;

            // Record arrival
            this.updateLastMessageTime();
            this.maybeLogMessage('Received message', rawMsg);

            // Hoist and app handling
            switch (topic) {
                case this.REG_SUCCESS_TOPIC:
                    this.installChannelKey(data.channelKey);
                    break;
                case this.TEST_MSG_TOPIC:
                    this.showTestMessageAlert(data);
                    break;
            }

            this.notifySubscribers(msg);
        } catch (e) {
            console.error('Error decoding websocket message', rawMsg, e);
        }
        this.updateConnectedStatus();
    }


    //------------------------
    // Subscription impl
    //------------------------
    notifySubscribers(message) {
        const subs = this.getSubsForTopic(message.topic);

        subs.forEach(sub => {
            try {
                sub.fn(message);
            } catch (e) {
                console.error(`Failure in subscription handler for topic ${message.topic}`, e);
            }
        });
    }

    getSubsForTopic(topic) {
        let ret = this._subsByTopic[topic];
        if (!ret) {
            ret = this._subsByTopic[topic] = [];
        }
        return ret;
    }

    //------------------------
    // Other impl
    //------------------------
    updateConnectedStatus() {
        const socketOpen = this._socket?.readyState === WebSocket.OPEN;
        if (!socketOpen && this.channelKey) {
            this.installChannelKey(null);
        }
    }

    @action
    installChannelKey(key) {
        this.channelKey = key;
    }

    @action
    updateLastMessageTime() {
        this.lastMessageTime = new Date();
    }

    buildWebSocketUrl() {
        const protocol = window.location.protocol == 'https:' ? 'wss:' : 'ws:',
            endpoint = 'xhWebSocket';

        return XH.isDevelopmentMode ?
            `${protocol}//${XH.baseUrl.split('//')[1]}${endpoint}` :
            `${protocol}//${window.location.host}${XH.baseUrl}${endpoint}`;
    }

    showTestMessageAlert(message) {
        XH.alert({
            title: 'Test Message',
            icon: Icon.bullhorn(),
            message
        });
    }

    maybeLogMessage(...args) {
        if (this.logMessages) console.log(...args);
    }

}

/**
 * Wrapper class to encapsulate and manage a subscription to messages for a given topic + handler.
 * Returned from `WebSocketService.subscribe()` and used to `unsubscribe()`.
 */
class WebSocketSubscription {
    topic;
    fn;

    constructor(topic, fn) {
        this.topic = topic;
        this.fn = fn;
    }

    destroy() {
        XH.webSocketService.unsubscribe(this);
    }
}

/**
 * @typedef {Object} WebSocketMessage
 * @property {string} topic
 * @property {*} message
 */
