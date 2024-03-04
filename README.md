# Built With Turborepo

## Requirements
- node js and npm or preferably pnpm
- docker and docker-compose or docker studio
- a docker hub account
- turbo repo
- ngrock, tunnel or an equivalent

## Gettign Started
1. Setup environment variables copy the .env_example file and rename it .env.development
2. create a docker hub account and set the DOCKER_USER and DOCKER_PASSWORD env variables
3. Follow the next section of this guide to set up ngrok
4. Follow the channel setup section of this guide to setup whatsapp in development
5. Run `docker-compose up` from the root of the project to create a local postgres database and object storage.
6. Open a new terminal window and Run `pnpm install` to install dependencies
7. run `npx turbo db:push` to create the db
8. run `npx turbo db:seed` to create test data
9. run `npx turbo dev` to start all of the development servers

## Setting up ngrock
1. create a free ngrock account to recieve a static tunnel domain, this way when you stop/start the server you dont need to reconfigure your webhooks
2. create an ngrok.yml file with the following content:
```
version: 2
authtoken: <your_ngrok_auth_token>
log_level: info
tunnels:
  first:
    proto: http
    addr: host.docker.internal:8000
    domain: <your_static_domain>
```

## Setting up emails with nodemailer
### connecting gmail
1. [create an app password](https://security.google.com/settings/security/apppasswords) in your gmail account
2. Add the following to your .env.development file
```
EMAIL_HOST=gmail
EMAIL_USER=<your_email>@gmail.com
EMAIL_PASSWORD=<gmail_app_password>
```

# Channel setup
## whatsapp
1. you must have a [meta developer account](https://developers.facebook.com/docs/development/register/)
2. [create a new app](https://developers.facebook.com/apps/creation/), select other and click next, select business, give your app a name and click create.
3. on the sidebar, in the products section, click on whatsapp, click on quickstart, select the respective facebook business account for the business and click create to recieve test credentials.
4. click on whatsapp -> API Setup, copy the temporary access token displayed and set it as the value for the WHATSAPP_API_TOKEN env variable, in this screen you can also find the WHATSAPP_BUSINESS_ID and WHATSAPP_PHONE_ID. The META_APP_ID can be found in the top left corner or on the url after apps/
5.  Now for the META_APP_SECRET, on the side bar click on Settings -> basic and on the top right click the show button on App Secret to find the value
7. Create a  WHATSAPP_VERIFY_TOKEN env variable with a random string
8. Start the development server, you musta have setup ngrock and configured it in dockercompose
9. Setup the webhook: on the side bar click on whatsapp -> configuration, add a callback url and the value of WHATSAPP_VERIFY_TOKEN

# Browse development Data

### Database: 
1. open up a new terminal and run `npx turbo db:studio`
2. you can access the studio in your browser in `localhost:5555`
3. Inside prisma studio you can viw/edit the data in all of your tables.

### Object storage: 
1. access minio objectstore in `localhost:9001`
2. Enter `username: minio`, `password: password`
3. click object browser and click on the automation-media bucket
4. here you can view all of the folders and static assets uploaded to s3 in development


# Post Processing Plugins

## Google Maps
extract the gps location (coordinates) and additional info from a text address

### Setup
1. Add the GOOGLE_CLOUD_API_KEY 
2. Add GEOCODING=true


## Open AI
- extract sentiment from chats
- extract demographic lead data from chats
- convert audio to text

### Setup
To use setup the OPENAI_API_KEY
1. 

