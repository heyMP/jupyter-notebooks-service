//@ts-check
const cookieParser = require("cookie-parser");
const uuid = require("uuid/v1");
const Docker = require("dockerode");
const docker = new Docker();
const SESSIONS = process.env.SESSIONS || true;
const cp = require("child_process")

let instances = []

module.exports = app => {
  if (SESSIONS) {
    // add the cookie parser
    app.use(cookieParser());
    // implement the middleware
    app.use(async (req, res, next) => {
      // create the md5 hash of the unique portions of the request
      res.header("Access-Control-Allow-Origin", req.get('origin'))
      res.header("Access-Control-Allow-Credentials", true)
      const sessionID = req.cookies.CODID || uuid()
      req.session = sessionID

      // if we don't have a cookie then set one
      if (typeof req.cookies.CODID === 'undefined') {
        res.cookie('CODID', sessionID, {
          httpOnly: true,
          domain: `cod.docker.localhost`,
          path: '/'
        })
      }
      else {
        // if there is an existing cookie then check if we have existing instances
        const slug = req.slug
        const existingInstance = instances.find(
          i => i.slug === slug && i.session === sessionID
        );
        if (existingInstance) {
          // pass on the existing host variable 
          req.codExistingInstanceHost = existingInstance.host
        }
      }

      next();
    });

    // start listening to hooks
    app.hooks.subscribe(next => {
      if (next.hook === 'containerCreated') {
        instances = [...instances, {
          containerID: next.value.id,
          session: next.value.req.session,
          slug: next.value.req.slug,
          host: next.value.host
        }]
      }
    })

  }
};
