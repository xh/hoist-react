# 🛠️ Hoist Build and Deployment (CI) Configuration

This section details the general steps we use to build a typical full-stack Hoist React application.
We consider the Grails-based back-end and React-based front-end to be two sides of the same
application. We build and deploy them together, and so the below includes info on building the
Grails / Gradle based server. That is technically the domain of
[Hoist Core](https://github.com/xh/hoist-core) but is detailed here to provide a consolidated look
at the build process.

**_At a high level, the build process:_**

-   Builds the Grails back-end via Gradle, producing a WAR file.
-   Builds the JS front-end via Webpack, producing a set of production ready client assets.
-   Copies both outputs into a pair of Docker containers and publishes those containers as the
    end-product of the build.
-   Deploys the new images, immediately or in a later step.

Hoist does not mandate the use of any particular CI system, although we recommend and use
[Jetbrains Teamcity](https://www.jetbrains.com/teamcity/) across multiple project deployments. The
examples in this section do reference some Teamcity terms (although these concepts are very general
and applicable to any common CI system).

Hoist also does not require the use of Docker or containerization in general, nor does it rely on
any particular container orchestration technology (e.g. Kubernetes). That said, the move towards
Docker-based deployments is clearly a popular one, and we have found containers to be a useful way
to bundle up and somewhat abstract away the two-part nature of full-stack Hoist UI applications.

💡 Note that the use of `appCode` throughout this section is a placeholder for the actual shortname
assigned to your application. This is a short, camelCased variant of the longer `appName` and is set
within the application source code via both the Gradle and Webpack configs.

### 1\) Setup/Prep

#### 1.1) Refresh and Lint JS Client

We do this first to fail fast if the client code doesn't pass the linter checks, which is relatively
common. This step could also run any preflight unit tests, etc. should you be diligent enough to
have them.

```bash
yarn
yarn lint
```

#### 1.2) Set Gradle project name (optional)

It’s best to be explicit with Gradle about the name of the project. By default it uses the name of
the containing directory, which in a CI build is probably a random hash.

Project names can be set by creating a `settings.gradle` in the project root with the following:

```properties
rootProject.name="appCode"
```

_If you have such a file in your project, this build step should be ignored / skipped entirely._

However, we sometimes do not check in a `settings.gradle` with each app project as we commonly build
and
test [custom Grails plugins](https://github.com/xh/hoist-core#custom-plugins-for-enterprise-deployments)
by running in
a [multi-project build mode](https://docs.gradle.org/current/userguide/multi_project_builds.html)
with an under-development Grails plugin _and_ the app checked out as siblings in a parent wrapper
directory. That parent directory (which is local to the developer’s machine and not in source
control) has its own `settings.gradle` file to bind the app and plugin together. You can’t have more
than one `settings.gradle` in a Gradle project, so this dev-time setup would conflict with a checked
in version should one exist.

As a workaround, we can have the build system take the app name (we use a project-level Teamcity
`%param%`) and then write out a `settings.gradle` file in place within the checked out source.

```bash
echo "rootProject.name = \"%appCode%\"" > settings.gradle
```

### 2\) Server and Client Builds

#### 2.1) Build Grails server WAR with Gradle

This step calls into a `build.gradle` script checked in with each project to build the Grails
server-side into a WAR.

This step takes an application version as well as an optional build tag, both of which are baked
into the build:

-   `xhAppVersion` - an x.y.z version for releases, or `x.y-SNAPSHOT` for transient builds.
-   `xhAppBuild` - this is an optional arg that gets baked into the server and client and exposed as a
    variable for display in the built-in Hoist admin client. We use it to pass a git commit hash,
    which then provides another way to cross-reference exactly what snapshot of the codebase was used
    to build any given running application.

Both version and build can be left unspecified, in which case the version will default to the
version specified within the app’s `gradle.properties` file (the build tag is nullable). Our
convention is to leave `gradle.properties` checked in with the next snapshot version and have the
builds override via a Gradle `-P` option when doing a particular versioned build. This means that
“snapshot” builds can simply leave the argument off, versioned builds can supply it (we use a
Teamcity param supplied via a required prompt), and `gradle.properties` only needs to change in
source control when a new major release moves us to a new snapshot.

Teamcity can use its dedicated “Gradle runner” to provide a more customized view on the task, or a
simple command runner could be used. In both cases, a Gradle wrapper should be checked in with the
project and used according to Gradle best practices.

```bash
# If building WAR only
./gradlew war -PxhAppVersion=%appVersion% -PxhAppBuild=%appBuild%
```

In both cases, the output is a `appCode-appVersion.war` file within `/build/libs`.

#### 2.2) Build JS Client with Webpack

This step builds all the client-side assets (JS/CSS/static resources) with Webpack, taking the
source and dependencies and producing concatenated, minified, and hashed files suitable for serving
to browsers. We use `yarn` as our package manager / runner tool.

This step takes several arguments that are passed via a script in `package.json` to Webpack. Each
project has a `webpack.config.js` file checked into the root of its `client-app` directory that
accepts any args and runs them through a script provided by
[hoist-dev-utils](https://github.com/xh/hoist-dev-utils/blob/master/configureWebpack.js) to produce
a fully-based Webpack configuration object. The appVersion and appBuild params, detailed above, are
the most common options passed in at build-time.

An example Teamcity command line runner. ⚠️ Note this must run with `client-app` as its working
directory:

```bash
appVersion=%appVersion%
# Source commit hash from CI system - approach here depends on TC build config/template
gitCommit=%build.vcs.number%
# Grab a shorter version of the full hash
appBuild=${gitCommit:0:10}
echo "Building $appVersion $appBuild"
yarn build --env.appVersion=$appVersion --env.appBuild=$appBuild
```

The output is a set of files within `/client-app/build/` .

### 3\) Docker images

🐳 The primary outputs of the overall build process are a pair of Docker containers, one for the
Grails server and one for the client JS assets. These include the build assets and are tagged with
the desired version, making them (as a pair) a complete and deployable instance of the application.

Applications should be checked in with a `/docker/` directory containing Dockerfiles and configs for
both the server and client containers. Both can be based on
[public images published by XH](https://hub.docker.com/r/xhio/), although an inspection of
[those](https://github.com/xh/xh-tomcat) [images](https://github.com/xh/xh-nginx) will show that
they are very thin layers on top of the official Tomcat and nginx images on Docker Hub.

#### 3.1) Build and Publish Tomcat Docker image

The Grails server component is deployed within a Tomcat container. The app should have a minimal
`/docker/tomcat/Dockerfile` (checked into source control) such as:

```dockerfile
FROM xhio/xh-tomcat:latest
COPY setenv.sh bin/
COPY *.war webapps/ROOT.war
```

The `setenv.sh` referenced here can also be checked in with the app project and used to set
environment variables / Java Opts required by Tomcat. This typically contains a reasonable `Xmx`
(max JVM heap) value for the app and a pointer to an “instance config” file used by Hoist apps to
bootstrap themselves with DB credentials and other low-level configuration required at startup. By
convention we place this file within a Docker volume that’s mounted to `/appCode` within each
container

All this means that a `/docker/tomcat/setenv.sh` typically looks like:

```bash
export JAVA_OPTS="$JAVA_OPTS -Xmx2G -Dio.xh.hoist.instanceConfigFile=/appCode/conf.yml"
```

That leaves the build with the job of generating a suitable tag for the container, running the
Docker build, and then pushing to an appropriate (likely internal) Docker registry. The container
tag should include the appCode + `-tomcat` to indicate that this is the Grails-side container.

An example Teamcity command line runner. ⚠️ Note this must run with `docker/tomcat` as its working
directory:

```bash
# Copy the WAR built above into the Docker context.
cp ../../build/libs/*.war .

# Determine an appropriate container tag from CI params.
containerTag=%internalDockerRegistry%/%appCode%-tomcat:%appVersion%
echo "Building Docker container $containerTag"
sudo docker build --pull -t "$containerTag" .

# Note whether build was successful, push if so, return error if not.
ret=$?
if [ $ret -eq 0 ]
then
  sudo docker push "$containerTag"
  ret=$?
else
  echo "Docker container build failed and was not pushed"
fi

# Cleanup and relay exit code to CI
rm *.war
exit $ret
```

#### 3.2) Build and Publish nginx Docker image

The static JS resources are deployed within an nginx container. The app should have a minimal
`/docker/nginx/Dockerfile/ ` (checked into source control) such as:

```dockerfile
FROM xhio/xh-nginx:latest
COPY app.conf $/XH_NGINX_CONFIG_PATH/
COPY build/ $/XH_NGINX_CONTENT_PATH/
```

Note that the `$XH` environment variables are set for convenience within the `xh-nginx` base image
Dockerfile.

The `app.conf` referenced here is an app-specific nginx configuration that should be checked in
alongside the Dockerfile. It should setup the available routes to serve each bundled client app,
configure SSL certificates if needed, do any required redirects, and (importantly) include a _proxy
configuration_ to pass traffic through from the nginx container to the Tomcat container. Hoist
deploys typically bind only the nginx ports to the host machine, then link the nginx and Tomcat
containers together via Docker so there’s a single point of entry (nginx) for incoming requests.
This means that no CORS or further, external proxy configuration is required to have the
nginx-dosted client communicate with its Tomcat back-end.

While the exact content of the `app.conf` file will vary depending on the app, a representative
example is below:

```
server {
    server_name  localhost;
    include includes/xh-secure-redirect.conf;
}

server {
    server_name  localhost;
    listen 443 ssl;
    root   /usr/share/nginx/html;

    ssl_certificate     /appCode/ssl/appCode.crt;
    ssl_certificate_key /appCode/ssl/appCode.pem;

    # Redirect root to /app/
    location = / {
        return 301 $scheme://$host/app/;
    }

    # Static JS/CSS/etc assets not matching a more specific selector below
    location / {
        expires $expires;
    }

    # App entry points - ensure trailing slash, match or fallback to index for sub-routes
    location = /admin {
        return 301 $uri/;
    }

    location /admin/ {
        try_files $uri /admin/index.html;
        expires $expires;
    }

    location = /app {
        return 301 $uri/;
    }

    location /app/ {
        try_files $uri /app/index.html;
        expires $expires;
    }

    # Proxy to Grails back-end - appCode-tomcat is defined by Docker (e.g. via link)
    location /api/ {
        proxy_pass http://appCode-tomcat:8080/;
        include includes/xh-proxy.conf;
    }
}
```

**_Note that this example configuration:_**

-   Uses `appCode` as a placeholder - use the same code as configured in the app’s server and client
    builds!
-   Calls several optional nginx config includes, sourced from the base `xh-nginx` image. The base
    image also copies in [an overall config](https://github.com/xh/xh-nginx/blob/master/xh.conf) that
    enables gzip compression and sets the `$expires` variable referenced above.
-   Redirects insecure requests to HTTPS on port 443 and terminates SSL itself, using certificates
    sourced from `/appCode/ssl` - the conventional location for Hoist apps to store certs and keys
    within an attached Docker volume.
-   Sets up locations for each client-app entry point / bundle - here we are shipping two JS apps with
    this container: `app` - the business-user facing app itself - and `admin` - the built-in Hoist
    Admin console. Apps might have other entry points, such as `mobile` or other more specific
    bundles.
-   Uses the `try_files` directive to attempt to service requests at sub-paths by handing back asset
    files if they exist, but otherwise falling back to `index.html` within that path. This allows for
    the use of HTML5 “pushState” routing, where in-app routes are written to the URL without the use
    of a traditional `#` symbol (e.g. <http://host/app/details/123>).
-   Creates a proxy endpoint at `/api/` to pass traffic through to the Tomcat back-end. This path is
    expected by the JS client, which will automatically prepend it to the path of any local/relative
    Ajax requests. This can be customized if needed on the client by adjusting the `baserUrl` param
    passed to `configureWebpack()`.

The build system now simply needs to copy the built client-side resources into the Docker context
and build the image. The sample below is simplified, but could also include the return code checks
in the Tomcat example above. Note the `-nginx` suffix on the container tag. ⚠️ This example must
also run with `docker/nginx` as its working directory:

```bash
cp -R ../../client-app/build/ .
containerTag=%internalDockerRegistry%/%appCode%-nginx:%appVersion%
echo "Building Docker container $containerTag"
sudo docker build --pull -t "$containerTag" .
sudo docker push "$containerTag"
```

#### 3.3) Docker cleanup

✨ At this point the build is complete and new versioned or snapshot images containing all the
runtime code have been pushed to a Docker registry and are ready for deployment.

It might be beneficial to add one more step to clean up local Docker images on the build agent, to
avoid them continuing to grow and take up disk space indefinitely. Note this forces Docker to pull
the base images anew each time, which takes a small amount of time/bandwidth. It could probably be
made more targeted if desired:

```bash
sudo docker system prune -af
```

### 4\) Docker deployment

🚢 We typically setup distinct targets for build vs. deploy, and configure deployment targets to
prompt for the version number and/or Docker hostname. This process will differ significantly
depending on the use (or not) of orchestration technology such as Kubernetes or AWS Elastic
Container Service (ECS).

Regardless of the specific implementation, the following points should apply:

-   Both `appCode-tomcat` and `appCode-nginx` containers should be deployed as a service / pair, and
    be kept at the same version.
-   The Tomcat container does not need to have any ports exposed/mapped onto the host (although it
    could if direct access is desired).
-   The nginx container typically exposes ports 80 and 443, although if a load balancer or similar is
    also in play that might vary (and would require appropriate adjustments to the `app.conf` nginx
    file outlined above).
-   The nginx container must be able to reach the Tomcat container at the same name included in its
    `app.conf` file - by convention, it expects to use `appCode-tomcat`. With straight Docker, this
    can be accomplished via the `--link` option (see below).
-   A shared volume can be used to host the instance config .yml file for the Grails server, SSL certs
    as required for nginx, and logs if so configured. This volume must be created in advance on the
    host and populated with any required bootstrap files. How that’s done again will depend on the
    particular Docker environment in play.

A sample Teamcity SSH-exec runner using Docker directly:

```bash
appCode=%appCode%
tomcatName=$appCode-tomcat
tomcatImage=%internalDockerRegistry%/$tomcatName:%appVersion%
echo "Deploying $tomcatImage"

# Stop and remove existing Tomcat container
sudo docker container stop $tomcatName
sudo docker container rm $tomcatName

# Pull Tomcat image at specified version
sudo docker image pull $tomcatImage

# Run Tomcat image and mount local docker volume for YML config / log storage
sudo docker run -d --name $tomcatName --mount type=volume,src=$appCode,dst=/$appCode --restart always $tomcatImage
echo "Deploying $tomcatImage complete"

nginxName=$appCode-nginx
nginxImage=%internalDockerRegistry%/$nginxName:%appVersion%
echo "Deploying $nginxImage"

# Stop and remove existing nginx container
sudo docker container stop $nginxName
sudo docker container rm $nginxName

# Pull nginx image at specified version
sudo docker image pull $nginxImage

# Run nginx image - link to Tomcat for proxying, expose ports, and mount local docker volume for SSL certificate access
sudo docker run -d --name $nginxName --link $tomcatName:$tomcatName -p 80:80 -p 443:443 --mount type=volume,src=$appCode,dst=/$appCode --restart always $nginxImage
echo "Deploying $nginxImage complete"

# Prune Docker, cleaning up dangling images and avoiding disk space bloat
sudo docker system prune -af
```

---

📫☎️🌎 info@xh.io | <https://xh.io/contact>

Copyright © 2024 Extremely Heavy Industries Inc.
