//@ts-check
const express = require("express");
const app = express();
const cors = require("cors");
const uuid = require("uuid/v1");
const PORT = process.env.PORT || 3000;
const cp = require("child_process");
const REGISTRY_WHITELIST = process.env.REGISTRY_WHITELIST || "^(?!.*[/| ]).*$";
const NETWORK = process.env.NETWORK || "containers-on-demand_default";
const validImage = require("./validImage.js");
const Docker = require("dockerode");
const docker = new Docker();
const HOST = process.env.HOST || "docker.localhost";
const { Observable } = require('rxjs')

app.use(cors());

app.get("/", async (req, res) => {
  try {
    const { host } = await createNewContainer(req.query);
    let url = new URL(`http://${host}`);
    // support path option
    if (typeof req.query.path !== "undefined") {
      url = new URL(req.query.path, url);
    }
    // if the user specified redirect
    if (typeof req.query.redirect !== "undefined") {
      res.redirect(url.toString())
    }
    // if not just return the url
    else {
      res.send(url.toString());
    }
  } catch (error) {
    res.status(400);
    res.send(error.toString());
  }
});

const createNewContainer = async options => {
  // Get document, or throw exception on error
  const id = uuid();
  const host = `${id}.${HOST}`;

  if (!options.image) {
    throw new Error("Image request not found");
  }

  // validate user requested image.
  if (!validImage(options.image, REGISTRY_WHITELIST)) {
    throw new Error("Requested image not whitelisted.");
  }

  let newContainer = {
    id,
    image: options.image,
    host,
    labels: [
      `traefik.frontend.rule=Host:${host}`,
      `created=${new Date().getTime()}`
    ]
  };
  if (options.port) {
    newContainer.labels = [
      ...newContainer.labels,
      `traefik.port=${options.port}`,
      `traefik.frontend.headers.customFrameOptionsValue=allow-from ${options.host}`,
      `traefik.frontend.headers.contentSecurityPolicy=frame-ancestors self ${options.host}`
    ];
  }
  // Basic Auth
  if (options.basicAuth) {
    const getHashedPassword = (username, password) => {
      const spawn = cp.spawnSync("htpasswd", ["-nb", username, password]);
      return spawn.stdout.toString().trim();
    };
    // explod the csv basic auth
    const basicAuthArry = options.basicAuth
      .split(",")
      .map(i => i.split(":"))
      .map(i => getHashedPassword(...i));
    // add each auth to traefik
    newContainer.labels = [
      ...newContainer.labels,
      `traefik.frontend.auth.basic.users=${basicAuthArry.join(",")}`
    ];
  }
  if (options.env) {
    newContainer["environment"] = options.env.split(",");
  }
  if (options.repo) {
    newContainer["repo"] = options.repo;
  }

  let command = ["run", "-d", "--network", NETWORK];
  newContainer.labels.forEach(label => {
    command = [...command, "-l", label];
  });
  if (newContainer.environment) {
    newContainer.environment.forEach(env => {
      command = [...command, "-e", env];
    });
  }
  if (options.networks) {
    options.networks.split(",").forEach(network => {
      command = [...command, "--network", network];
    });
  }
  if (options.port) {
    command = [ ...command, "--health-cmd", `curl --fail http://localhost:${Number(options.port)} || exit 1`]
  }

  command = [...command, newContainer.image];
  const cpStartContainer = cp.spawnSync("docker", command);
  const output = cpStartContainer.output.toString();
  const newContainerId = /([a-zA-Z0-9]{64})/g.exec(output)[0];
  await containerStatusCheck({
    id: newContainerId,
    status: "health_status: healthy"
  });
  if (newContainer.repo) {
    const cpRepo = cp.spawnSync("docker", [
      "exec",
      newContainerId,
      "git",
      "clone",
      newContainer.repo
    ]);
  }

  return newContainer;
};

const eventsStream = new Observable(subscriber => {
  docker.getEvents({}, (err, data) => {
    if (data) {
      data.on("data", data => {
        const event = JSON.parse(data.toString());
        subscriber.next(event)
      });
    }
  });
});
// start event stream immediately 
eventsStream.subscribe(res => res)

/**
 * Return a Promise once the container meets the status check.
 * @param {*} status
 */
const containerStatusCheck = ({ id, status }) =>
  new Promise((resolve, reject) => 
    eventsStream.subscribe({
      next(event) {
        if (event.status === status && event.id === id) {
          resolve(event)
        }
      }
    })
  );


app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));
