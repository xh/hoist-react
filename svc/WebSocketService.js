/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {AppState, HoistService, XH} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {Icon} from '@xh/hoist/icon';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {find, pull} from 'lodash';

/**
 * Establishes and maintains a websocket connection to the Hoist server, if enabled via appSpec.
 *
 * Callers can register a callback to subscribe to incoming messages by topic and can send messages
 * back to the server on the same channel. Once a connection is established, this service exposes a
 * `channelKey` property that is unique to this user and client app instance. This key can be used
 * in application-specific requests to the server to identify this client connection. The server
 * can then push messages as requested - e.g. when a particular query or dataset is updated.
 *
 * Note requires the server-side application to be configured to listen to inbound websocket
 * connections. See WebSocketService.groovy in hoist-core for additional documentation.
 *
 * {@see WebSocketIndicator} - a simple component for visually displaying connection status.
 */
@HoistService
export class WebSocketService {

    HEARTBEAT_TOPIC = 'xhHeartbeat';
    REG_SUCCESS_TOPIC = 'xhRegistrationSuccess';
    TEST_MSG_TOPIC = 'xhTestMessage';

    /** @property {string} - unique channel ID assigned by server upon successful registration. */
    channelKey;

    /** @property {boolean} - set to true to log all sent/received messages - very chatty. */
    logMessages = false;

    @observable
    connected = false;

    @observable
    lastMessageTime;

    _timer;
    _socket;
    _subsByTopic = {};

    get enabled() {return XH.appSpec.webSocketsEnabled}

    async initAsync() {
        if (!this.enabled) return;

        try {
            this.connect();
        } catch (e) {
            console.error('Failure initializing webSocketService', e);
        }

        this._timer = Timer.create({
            runFn: () => this.heartbeatOrReconnect(),
            interval: 10 * SECONDS,
            delay: 10 * SECONDS
        });

        this.addReaction({
            track: () => XH.appState,
            run: (appState) => {
                if (appState == AppState.SUSPENDED) {
                    this.shutdown();
                }
            }
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
     * @param {WebSocketSubscription} subscription - the object returned by subscribe() when the
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
        if (!this.isSocketConnected()) {
            throw new XH.exception('Unable to send message via websocket - not connected.');
        }

        this._socket.send(JSON.stringify(message));
        this.maybeLogMessage('Sent message', message);
    }


    //------------------------
    // Implementation
    //------------------------
    connect() {
        const socket = new WebSocket(this.buildWebSocketUrl());
        socket.onopen = () => this.onOpen();
        socket.onclose = () => this.onClose();
        socket.onerror = (e) => this.onError(e);
        socket.onmessage = (data) => this.onMessage(data);

        this._socket = socket;
    }

    heartbeatOrReconnect() {
        if (this.isSocketConnected()) {
            this.sendMessage({topic: this.HEARTBEAT_TOPIC, data: 'ping'});
        } else {
            console.warn('WebSocket unexpectedly disconnected - attempting to reconnect.');
            this.connect();
        }
    }

    shutdown() {
        if (this._timer) this._timer.cancel();
        this._socket.close();
    }


    //------------------------
    // Socket events impl
    //------------------------
    onOpen() {
        console.debug('WebSocket connection opened');
        this.updateConnectedStatus();
    }

    onClose() {
        console.debug('WebSocket connection closed');
        this.updateConnectedStatus();
    }

    onError(e) {
        console.error('WebSocket connection error', e);
        this.updateConnectedStatus();
    }

    onMessage(rawMsg) {
        try {
            const msg = JSON.parse(rawMsg.data),
                {topic, data} = msg;

            if (topic == this.REG_SUCCESS_TOPIC) {
                this.channelKey = data.channelKey;
            } else if (topic == this.TEST_MSG_TOPIC) {
                this.showTestMessageAlert(data);
            }

            this.updateLastMessageTime();
            this.maybeLogMessage('Received message', rawMsg);
            this.notifySubscribersAsync(msg);
        } catch (e) {
            console.error('Error decoding websocket message', rawMsg, e);
        }
        this.updateConnectedStatus();
    }


    //------------------------
    // Subscription impl
    //------------------------
    async notifySubscribersAsync(message) {
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
    @action
    updateLastMessageTime() {
        this.lastMessageTime = new Date();
    }

    @action
    updateConnectedStatus() {
        this.connected = this.isSocketConnected();
    }

    isSocketConnected() {
        return this._socket && this._socket.readyState == WebSocket.OPEN;
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
 * Wrapper class to encapsulate a subscription to websocket messages on a topic for a given handler.
 * Returned from `WebSocketService.subscribe()` and used to `unsubscribe()`.
 */
class WebSocketSubscription {
    topic;
    fn;

    constructor(topic, fn) {
        this.topic = topic;
        this.fn = fn;
    }
}

/**
 * @typedef {Object} WebSocketMessage
 * @property {string} topic
 * @property {*} message
 */