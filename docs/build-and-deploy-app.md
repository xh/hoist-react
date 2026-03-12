# Application Build and Deployment

This document details the general steps used to build and deploy a typical full-stack Hoist
application. We consider the Grails-based back-end and React-based front-end to be two sides of the
same application. We build and deploy them together, and so the below includes info on building the
Grails / Gradle based server. That is technically the domain of
[Hoist Core](https://github.com/xh/hoist-core) but is detailed here to provide a consolidated look
at the build process.

For CI/CD of the hoist-react library itself (linting, npm publishing), see
[Build & Publish](./build-and-publish.md).

At a high level, the application build process:

- Builds the Grails back-end via Gradle, producing a WAR file.
- Builds the JS front-end via Webpack, producing a set of production-ready client assets.
- Copies both outputs into a pair of Docker containers and publishes those containers as the
  end-product of the build.
- Deploys the new images, immediately or in a later step.

Hoist does not mandate the use of any particular CI system for application builds. The examples in
this section use generic shell commands that can be adapted to any CI platform (GitHub Actions,
GitLab CI, Jenkins, etc.).

Hoist also does not require the use of Docker or containerization in general, nor does it rely on
any particular container orchestration technology (e.g. Kubernetes). That said, the move towards
Docker-based deployments is clearly a popular one, and we have found containers to be a useful way
to bundle up and somewhat abstract away the two-part nature of full-stack Hoist UI applications.

**Note:** the use of `appCode` throughout this section is a placeholder for the actual shortname
assigned to your application. This is a short, camelCased variant of the longer `appName` and is set
within the application source code via both the Gradle and Webpack configs.

## Setup/Prep

### Refresh and Lint JS Client

We do this first to fail fast if the client code doesn't pass the linter checks, which is relatively
common. This step could also run any preflight unit tests, etc. should you be diligent enough to
have them. The below assumes `yarn` is used for the project's package manager, sub with `npm` if
using that instead.

```bash
yarn
yarn lint
```

## Server and Client Builds

### Build Grails server WAR with Gradle

This step calls into a `build.gradle` script checked in with each project to build the Grails
server-side into a WAR.

This step takes an application version as well as an optional build tag, both of which are baked
into the build:

- `xhAppVersion` - an x.y.z version for releases, or `x.y-SNAPSHOT` for transient builds.
- `xhAppBuild` - this is an optional arg that gets baked into the server and client and exposed as a
  variable for display in the built-in Hoist admin client. We use it to pass a git commit hash,
  which then provides another way to cross-reference exactly what snapshot of the codebase was used
  to build any given running application.

Both version and build can be left unspecified, in which case the version will default to the
version specified within the app's `gradle.properties` file (the build tag is nullable). Our
convention is to leave `gradle.properties` checked in with the next snapshot version and have the
builds override via a Gradle `-P` option when doing a particular versioned build. This means that
"snapshot" builds can simply leave the argument off, versioned builds can supply a version via a CI
parameter, and `gradle.properties` only needs to change in source control when a new major release
moves us to a new snapshot.

A Gradle wrapper should be checked in with the project and used according to Gradle best practices.

```bash
./gradlew war -PxhAppVersion=$APP_VERSION -PxhAppBuild=$APP_BUILD
```

The output is a `appCode-appVersion.war` file within `/build/libs`.

### Build TS Client with Webpack

This step builds all the client-side assets (TS/CSS/static resources) with Webpack, taking the
source and dependencies and producing concatenated, minified, and hashed files suitable for serving
to browsers.

This step takes several arguments that are passed via a script in `package.json` to Webpack. Each
project has a `webpack.config.js` file checked into the root of its `client-app` directory that
accepts any args and runs them through a script provided by
[hoist-dev-utils](https://github.com/xh/hoist-dev-utils/blob/master/configureWebpack.js) to produce
a fully-based Webpack configuration object. See that project for additional details.

The appVersion and appBuild params, detailed above, are the most common options set at build-time.

**Note:** this must run with `client-app` as its working directory:

```bash
# Source commit hash from CI system (e.g. $GITHUB_SHA, $CI_COMMIT_SHA, etc.)
APP_BUILD=${GIT_COMMIT:0:10}
echo "Building $APP_VERSION $APP_BUILD"
yarn build --env appVersion=$APP_VERSION --env appBuild=$APP_BUILD
```

The output is a set of files within `/client-app/build/`.

## Docker Container Images

The primary outputs of the overall build process are a pair of Docker containers, one for the
Grails server and one for the client JS assets. These include the build assets and are tagged with
the desired version, making them (as a pair) a complete and deployable instance of the application.

Applications should be checked in with a `/docker/` directory containing Dockerfiles and configs for
both the server and client containers. Both can be based on
[public images published by XH](https://hub.docker.com/r/xhio/), although an inspection of
[those](https://github.com/xh/xh-tomcat) [images](https://github.com/xh/xh-nginx) will show that
they are very thin layers on top of the official Tomcat and nginx images on Docker Hub.

### Build and Publish Tomcat Docker Image

The Grails server component is deployed within a Tomcat container. The app should have a minimal
`/docker/tomcat/Dockerfile` (checked into source control) such as:

```dockerfile
# Update the tag below to a fixed version for stability, or next to get a regularly updated build
FROM xhio/xh-tomcat:next-jdk17
COPY setenv.sh bin/
COPY *.war webapps/ROOT.war
```

------

#### Optional `setenv.sh`

The optional `setenv.sh` referenced here can be checked in with the app project and used to set
environment variables / Java Opts required by Tomcat. This typically contains a reasonable `Xmx`
(max JVM heap) value for the app, either hard-coded or referencing an env variable:

```bash
export JAVA_OPTS="$JAVA_OPTS -Xmx2G"
```

------

That leaves the build with the job of generating a suitable tag for the container, running the
Docker build, and then pushing to an appropriate (likely internal) Docker registry. The container
tag should include the appCode + `-tomcat` to indicate that this is the Grails-side container.

**Note:** this must run with `docker/tomcat` as its working directory:

```bash
# Copy the WAR built above into the Docker context.
cp ../../build/libs/*.war .

# Determine an appropriate container tag.
containerTag=$DOCKER_REGISTRY/$APP_CODE-tomcat:$APP_VERSION
echo "Building Docker container $containerTag"
docker build --pull -t "$containerTag" .

# Note whether build was successful, push if so, return error if not.
ret=$?
if [ $ret -eq 0 ]
then
  docker push "$containerTag"
  ret=$?
else
  echo "Docker container build failed and was not pushed"
fi

# Cleanup and relay exit code to CI
rm *.war
exit $ret
```

### Build and Publish nginx Docker Image

The static JS resources are deployed within an nginx container. The app should have a minimal
`/docker/nginx/Dockerfile` (checked into source control) such as:

```dockerfile
# Update the tag below to a fixed version for stability, or next to get a regularly updated build
FROM xhio/xh-nginx:next
COPY app.conf $XH_NGINX_CONFIG_PATH/
COPY build/ $XH_NGINX_CONTENT_PATH/
```

Note that the `$XH_` environment variables are set for convenience within the `xh-nginx` base image
Dockerfile.

------

#### About the `app.conf` nginx configuration file

The `app.conf` referenced above is an app-specific nginx configuration that should be checked in
alongside the Dockerfile. It should setup the available routes to serve each bundled client app,
handle any required redirects, and (importantly) include a _proxy configuration_ to pass traffic
through from the nginx container to the Tomcat container. Hoist deploys typically bind only the
nginx ports to the host machine, then link the nginx and Tomcat containers together via Docker/k8s
so there's a single point of entry (nginx) for incoming requests. This means that no CORS or
further, external proxy configuration is required to have the nginx-hosted client communicate with
its Tomcat back-end.

While the exact content of the `app.conf` file will vary depending on the app, a representative
example is below:

```nginx
server {
    server_name  localhost;
    listen 80;
    root   /usr/share/nginx/html;

    # Suppress nginx version in response headers.
    server_tokens off;

    # Security headers — consider adding the following, tailored to your deployment:
    #   - Strict-Transport-Security (HSTS)
    #   - Content-Security-Policy (CSP)
    #   - Referrer-Policy
    #   - Permissions-Policy
    #   - X-Content-Type-Options
    #   - X-Frame-Options
    # See Toolbox for a representative example.

    # Redirect root to platform-appropriate default client app - either app or mobile.
    location = / {
        if ($is_mobile) {
            return 302 https://$host/mobile/;
        }

        return 302 https://$host/app/;
    }

    # Entry points for this project's client apps, as built by Webpack.
    # Keep the list below in sync with entry-point files within `/client-app/src/apps`.
    location ~ ^/(?<clientAppCode>admin|app|mobile)(?:/|$) {
        # Add trailing slash if not present. Use explicit redirect w/leading https as this nginx is
        # behind a load balancer and would otherwise redirect first to http, resulting in an excess
        # redirect as the load balancer then sends the browser back to https.
        rewrite ^/(?<clientAppCodeNoSlash>admin|app|mobile)$ https://$host/$clientAppCodeNoSlash/ permanent;

        # When at the correct path, check if the requested path exists as a file - if so, serve it.
        # If not, serve index.html - this allows app routing to work - e.g. /admin/general/config
        # will load /admin/index.html and allow the client app code to interpret the rest.
        try_files $uri $uri/ /$clientAppCode/index.html;

        # Set cache expiry as per $expires var set by xh-nginx's `xh.conf` - this will cache JS/CSS
        # resources indefinitely while ensuring that index.html is re-read every time.
        expires $expires;
    }

    # Proxy to Grails back-end, run within the same pod/task as this nginx container.
    location ^~ /api/ {
        proxy_pass http://localhost:8080/;
        include includes/xh-proxy.conf;

        # Set Cookie policy to enforce HTTPS and control cross-site access.
        proxy_cookie_path / "/; HTTPOnly; Secure; SameSite=None";

        # Explicitly disable caching for proxied API requests.
        expires epoch;
    }

    # Static JS/CSS/etc assets not matching a more specific selector above.
    location / {
        expires $expires;
    }
}
```

Note that this example configuration:

- Uses nginx config includes sourced from the base `xh-nginx` image. The base image also copies
  in [an overall config](https://github.com/xh/xh-nginx/blob/master/xh.conf) that enables gzip
  compression and sets the `$expires` variable referenced above.
- Assumes a load balancer / ingress is handling SSL termination and that the nginx container is not
  directly exposed to the internet. While uncommon for Hoist apps, nginx can handle SSL if needed.
- Sets up locations for three client-app entry points / bundles: `app`, `admin`, and `mobile`, with
  `mobile` being a dedicated app for mobile clients. Not all apps will have these three - some might
  lack a mobile client entirely, or ship other dedicated client apps. Uses named capture groups
  for cleaner routing logic.
- Uses the `try_files` directive to attempt to service requests at sub-paths by handing back asset
  files if they exist, but otherwise falling back to `index.html` within that path. This allows for
  the use of HTML5 "pushState" routing, where in-app routes are written to the URL without the use
  of a traditional `#` symbol (e.g. <http://host/app/details/123>).
- Creates a proxy endpoint at `/api/` to pass traffic through to the Tomcat back-end, which here is
  expected to be reachable from nginx via `localhost`. Uses `^~` to ensure this location takes
  priority over any regex locations.
    - The `/api/` path is expected by the JS client, which will automatically prepend it to the path
      of any local/relative fetch requests. This can be customized if needed on the client by
      adjusting the `baseUrl` param passed to `configureWebpack()`.
    - The use of `localhost` is enabled via a deployment configuration that runs the two containers
      on the same pod / task / workload. This will vary based on the deployment environment.
    - Cookie security flags and cache disabling are set explicitly on proxied responses.

------

The build system now simply needs to copy the built client-side resources into the Docker context
and build the image. Note the `-nginx` suffix on the container tag.

**Note:** this must run with `docker/nginx` as its working directory:

```bash
cp -R ../../client-app/build/ .
containerTag=$DOCKER_REGISTRY/$APP_CODE-nginx:$APP_VERSION
echo "Building Docker container $containerTag"
docker build --pull -t "$containerTag" .
docker push "$containerTag"
```

### Docker Cleanup

At this point the build is complete and new versioned or snapshot images containing all the
runtime code have been pushed to a Docker registry and are ready for deployment.

It might be beneficial to add one more step to clean up local Docker images on the build agent, to
avoid them continuing to grow and take up disk space indefinitely. Note this forces Docker to pull
the base images anew each time, which takes a small amount of time/bandwidth. It could be made more
targeted if desired:

```bash
docker system prune -af
```

## Docker Deployment

XH typically creates distinct targets for build vs. deploy, and configures deployment targets to
prompt for the version number and/or Docker hostname. This process will differ significantly
depending on the use (or not) of orchestration technology such as Kubernetes or AWS Elastic
Container Service (ECS).

Regardless of the specific implementation, the following points should apply:

- Both `appCode-tomcat` and `appCode-nginx` containers should be deployed as a service / pair, and
  be kept at the same version.
- The Tomcat container does not need to have any ports exposed/mapped onto the host (although it
  could if direct access is desired).
- The nginx container typically exposes port 80, although if a load balancer or similar is
  also in play that might vary (and would require appropriate adjustments to the `app.conf` nginx
  file outlined above).
- The nginx container must be able to reach the Tomcat container at the same name included in its
  `app.conf` file, typically `localhost` (as in the example above).
- A persistent volume can be used to store logs if so configured. How that's done again will depend
  on the particular deployment environment and is beyond the scope of this doc.

A sample deployment script using Docker directly:

```bash
APP_CODE=appCode
tomcatName=$APP_CODE-tomcat
tomcatImage=$DOCKER_REGISTRY/$tomcatName:$APP_VERSION
echo "Deploying $tomcatImage"

# Stop and remove existing Tomcat container
docker container stop $tomcatName
docker container rm $tomcatName

# Pull Tomcat image at specified version
docker image pull $tomcatImage

# Run Tomcat image and mount local docker volume for YML config / log storage
docker run -d --name $tomcatName --mount type=volume,src=$APP_CODE,dst=/$APP_CODE --restart always $tomcatImage
echo "Deploying $tomcatImage complete"

nginxName=$APP_CODE-nginx
nginxImage=$DOCKER_REGISTRY/$nginxName:$APP_VERSION
echo "Deploying $nginxImage"

# Stop and remove existing nginx container
docker container stop $nginxName
docker container rm $nginxName

# Pull nginx image at specified version
docker image pull $nginxImage

# Run nginx image - link to Tomcat for proxying, expose ports, and mount local docker volume
docker run -d --name $nginxName --link $tomcatName:$tomcatName -p 80:80 --mount type=volume,src=$APP_CODE,dst=/$APP_CODE --restart always $nginxImage
echo "Deploying $nginxImage complete"

# Prune Docker, cleaning up dangling images and avoiding disk space bloat
docker system prune -af
```
