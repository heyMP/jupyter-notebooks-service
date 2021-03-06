// killswitch
import { LitElement, html } from "lit-element/lit-element.js";
import "@eberlywc/thin-spinner/thin-spinner.js";

export class ContainersOnDemand extends LitElement {
  static get properties() {
    return {
      endpoint: { type: String },
      host: { type: String },
      image: { type: String },
      path: { type: String },
      port: { type: String },
      repo: { type: String },
      env: { type: String },
      healthcheck: { type: String },
      sessions: { type: Boolean },
      basicAuth: { type: String },
      button: { type: String },
      loading: { type: Boolean, reflect: true },
      error: { type: Boolean, reflect: true },
      _url: { type: String },
    };
  }
  constructor() {
    super();
    this.endpoint = "";
    this.path = "";
    this.image = "";
    this.port = "80";
    this.repo = "";
    this.env = "";
    this.healthcheck = "";
    this.sessions = true;
    this.button = "";
    this.basicAuth = "";
    this.host = window.location.host;
    this.loading = false;
    this.error = false;
    this._url = "";

    // See endpoint
    if (typeof window.__env !== "undefined") {
      if (typeof window.__env.CONTAINERS_ON_DEMAND_ENDPOINT !== "undefined") {
        this.endpoint = window.__env.CONTAINERS_ON_DEMAND_ENDPOINT;
      }
    }
  }

  _start() {
    this.loading = true;
    const repo = this.repo ? `&repo=${this.repo}` : "";
    const env = this.env ? `&env=${this.env}` : "";
    const basicAuth = this.basicAuth ? `&basicAuth=${this.basicAuth}` : "";
    const path = this.path ? `&path=${this.path}` : "";
    const healthcheck = this.healthcheck
      ? `&healthcheck=${this.healthcheck}`
      : "";
    const sessions = this.sessions ? `&sessions=${this.sessions}` : "";
    const query = `${this.endpoint}?image=${this.image}&host=${this.host}&port=${this.port}${repo}${env}${basicAuth}${path}${healthcheck}`;
    if (query.length > 0) {
      let fetchOptions = {};
      if (this.sessions) {
        fetchOptions = { ...fetchOptions, credentials: "include" };
      }
      fetch(query, fetchOptions)
        .then((res) => {
          if (!res.ok) {
            throw new Error(res);
          }
          return res;
        })
        .then((res) => res.text())
        .then((res) => {
          this._url = `${res}`;
        })
        .catch((res) => {
          setTimeout(() => {
            console.log(res);
            this.loading = false;
            this.error = true;
          }, 2000);
        });
    }
  }
  render() {
    return html`
      <style>
        :host {
          display: flex;
          position: relative;
          justify-content: center;
          align-items: center;
          position: relative;
        }
        a {
          color: inherit;
          text-decoration: inherit;
          background: #29cc18;
          text-transform: uppercase;
          padding: 1em;
          color: white;
          display: inline-block;
          font-size: 1.2em;
        }
        iframe {
          width: 100%;
          height: 100%;
          zoom: 0.75;
          position: absolute;
        }
        #button {
          display: inline-flex;
          width: 80%;
          margin: auto;
          max-width: 400px;
          /* Permalink - use to edit and share this gradient: https://colorzilla.com/gradient-editor/#8efc88+0,52ea52+40,0ca304+100 */
          background: #8efc88; /* Old browsers */
          background: -moz-linear-gradient(
            -45deg,
            #8efc88 0%,
            #52ea52 40%,
            #0ca304 100%
          ); /* FF3.6-15 */
          background: -webkit-linear-gradient(
            -45deg,
            #8efc88 0%,
            #52ea52 40%,
            #0ca304 100%
          ); /* Chrome10-25,Safari5.1-6 */
          background: linear-gradient(
            135deg,
            #8efc88 0%,
            #52ea52 40%,
            #0ca304 100%
          ); /* W3C, IE10+, FF16+, Chrome26+, Opera12+, Safari7+ */
          filter: progid:DXImageTransform.Microsoft.gradient( startColorstr='#8efc88', endColorstr='#0ca304',GradientType=1 ); /* IE6-9 fallback on horizontal gradient */
          padding: 18px;
          text-align: center;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          text-transform: uppercase;
          color: black;
          cursor: pointer;
        }
        thin-spinner {
          display: block;
          position: absolute;
          top: 50%;
          left: 0;
          width: 100%;
          height: 100%;
        }
        #error {
          display: flex;
          align-items: center;
        }
        #error-icon {
          font-size: 2em;
        }
      </style>
      ${this._url
        ? // if we have a url then show the iframe
          html`
            <iframe
              no-frame
              frameborder="0"
              src=${this._url}
              @error=${this._iframeError}
            ></iframe>
          `
        : // else if the user selected button then show a button
        this.button
        ? // if the button is in loading state then show the spinner
          this.loading
          ? html` <thin-spinner .loading="${this.loading}"></thin-spinner> `
          : // if it's in error state then show the error
          this.error
          ? html`
              <div id="error">
                <span id="error-icon">😿</span> Something went wrong
              </div>
            `
          : // if not then show the button
            html`
              <button id="button" @click=${this._start}>
                ${this.button}
              </button>
            `
        : html` Could not resolve container `}
    `;
  }
}