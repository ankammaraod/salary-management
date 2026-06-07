#!/bin/sh
set -e
node node_modules/.bin/knex --knexfile dist/knexfile.js migrate:latest
node node_modules/.bin/knex --knexfile dist/knexfile.js seed:run
exec node dist/server.js
