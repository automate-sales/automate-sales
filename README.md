# Built With Turborepo

## Requirements
- node js and npm or preferably pnpm
- docker and docker-compose or docker studio

## Gettign Started
1. Setup your environment variables
2. Run `docker-compose up` from the root of the project to create a local postgres database and object storage.
3. Open a new terminal window and Run `pnpm install` to install dependencies
4. run `turbo db:generate` to generate the prisma client
5. run `turbo db:push` to create the db schema
6. run `turbo db:seed` to create test data
7. run `turbo dev` to start all of the development servers

## interacting with test data

### Database: 
1. open up a new terminal and run `npx turbo db:studio`
2. you can access the studio in your browser in `localhost:5555`
3. Inside prisma studio you can viw/edit the data in all of your tables.

### Object storage: 
1. access minio objectstore in `localhost:9001`
2. Enter `username: minio`, `password: password`
3. click object browser and click on the automation-media bucket
4. here you can view all of the folders and static assets uploaded to s3 in development
