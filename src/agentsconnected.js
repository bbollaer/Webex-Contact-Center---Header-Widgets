(function () {
  const template = document.createElement("template");
  template.innerHTML = `<div id="table-container"></div>`;

  class AgentActivityName extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.timeoutID = undefined;
    }

    connectedCallback() {
      this.shadowRoot.appendChild(template.content.cloneNode(true));
      var context = this.shadowRoot;
      var org = this.orgId;
      var dc = this.dc.slice(4);
      var teamName = this.teamName;
      var access_token = this.token;
      GetAgentsConnectedForTheTeam({ token: access_token, team: this.teamName });

      function GetAgentsConnectedForTheTeam(result) {
        access_token = result.token;
        teamName = result.team;

        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("Authorization", "Bearer " + access_token);
        const currentTimeMs = Date.now().toString();
        const raw = JSON.stringify({
        query: `
{
    agentSession(
    from: "1767874520000" 
    to: "${currentTimeMs}"
    filter: {
        and: [
            { isActive: { equals: true } }
            { teamName: { equals: "${teamName}" } }
        ]
    }
        aggregations: [
            { field: "agentId", name: "AgentsConnectes", type: cardinality }
        ]
    ) {
        agentSessions {
            aggregation {
                name
                value
            }
        }
    }
}
`,
          variables: {},
        });

        const requestOptions = {
          method: "POST",
          headers: myHeaders,
          body: raw,
          redirect: "follow",
        };

        fetch(
          "https://api.wxcc-"+dc+".cisco.com/search?orgId="+org, requestOptions)
          .then((response) => response.text())
          .then((result) => DisplayActivity(JSON.parse(result), context))
          .catch((error) => console.log("[ACTIVITEAGENTSCONNECTES] - Error -> ", error));
      }

        function DisplayActivity(result, context) {
            console.log("ACTIVITEAGENTSCONNECTES: result -> ", result);
            const tableContainer = context.getElementById("table-container");

            if (!result.data || !result.data.agentSession || !result.data.agentSession.agentSessions) {
                // tableContainer.innerHTML = "<p>Rien retourné.</p>";
                return;
            }

            const tasks = result.data.agentSession.agentSessions;
            console.log("ACTIVITEAGENTSCONNECTES: Records -> ", tasks);
            tableContainer.innerHTML = generateTaskTable(tasks);
        }

        function generateTaskTable(agentSessions) {
            const value = agentSessions?.[0]?.aggregation?.[0]?.value ?? 0;
            let table = `<span style="background:#000080; color:white; padding:2px 8px; border-radius:10px; font-family:Roboto, sans-serif; font-size:12px; font-weight:bold; display:inline-flex; align-items:center; gap:4px;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 12a8 8 0 0 1 16 0" />
      <rect x="2" y="11" width="3" height="6" rx="1.5" />
      <rect x="19" y="11" width="3" height="6" rx="1.5" />
      <path d="M19 15c2 1 2 3-1 4" />
      <circle cx="17" cy="19" r="1" fill="white" stroke="none" />
    </svg>${value}</span>`;
            return table;
        }

        // Rafraîchissement toutes les 5 secondes
        this.intervalID = setInterval(() => {
            GetAgentsConnectedForTheTeam({ token: access_token, team: this.teamName });
        }, 5000);
    }

    disconnectedCallback() {
        if (this.intervalID) {
            clearInterval(this.intervalID);
        }
    }  

  }

  window.customElements.define("agents-connectes", AgentActivityName);
})();