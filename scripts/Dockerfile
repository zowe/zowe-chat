# Dockerfile to run the zowe chat project locally
FROM node:16 as builder

COPY . /zowe-chat
WORKDIR /zowe-chat
RUN npm install
RUN npm run build


FROM node:16

COPY --from=builder /zowe-chat/.build/*.tgz /