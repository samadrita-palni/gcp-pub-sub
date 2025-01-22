# Pub Sub Monorepo

## Description

- Pub Sub publisher and subscriber events services using [Node](https://nodejs.org/en).
- For local deployemnt
    - We will be using a pub-sub emulator running on localhost:8085
    - We will be using a firebase emulator whose UI running on localhost:4000
    - We will be using redis running on localhost:6379
- No need to individually connect to GCP or install any application like redis as docker will take care of all that in local env.

## Installation

### Required Software

- Docker 20.x
    - [Ubuntu Installation Steps](https://docs.docker.com/engine/install/ubuntu/#install-using-the-convenience-script)
    - [Mac Installation Steps](https://docs.docker.com/desktop/mac/install/)
- docker-compose v2.3
    - Run `docker compose version` to check if its already installed in your system.
    - If not installed, follow these [installation steps](https://docs.docker.com/compose/install/)
    - Make sure `docker compose version` returns the desired version.
- Nodejs v18
    - Recommended way to install is via [NVM](https://github.com/nvm-sh/nvm#installing-and-updating)

Note that we are not installing MongoDB separately, as it's included in the docker-compose setup.

### Cloing the repository

```bash
git clone -c http.sslVerify=false https://github.com/samadrita-palni/gcp-pub-sub.git
```

### Monorepo setup

- Install the node_modules for the monorepo using below command in the `root folder`. We have a single lock file in the root folder.

    ```bash
          npm install
    ```


- If any new package is required for any service, from that service directory below command can be ran in the terminal

  ```bash
        npm i <package-name>
  ```

- Inorder to run all the services using docker, run the below command from the `root folder`.

    ```bash
        docker compose build
    ```

    ```bash
        docker compose --profile <service-name> up
    ```

## Deploy to GCP

- We can deploy the entire code to gcp using the GCP build trigger and specifying the `cloudbuild.yaml` file for deployment
- It will deploy the publisher in one cloud run service and the subscriber in a seperate cloud run service
- Need to add the respective env variables in the cloud run (automation not done for this)

## Logging

- Used `winston` for logging

## Monitoring

- Created three custom metrics for monitoring
  - Count the number of published events with filtering by `eventType`. (from code)
  - Aggregation latency per time window. (from code)
  - Error rates or retry counts for failed processing. (from GCP using logs)

## Testing

- Run the `triggeEvent.js` file inside the `test` folder for api stimulation