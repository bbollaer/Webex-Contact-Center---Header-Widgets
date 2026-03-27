(function () {
  const template = document.createElement("template");
  template.innerHTML = `<div id="table-container"></div>`;

  class NbAppelsEnFile extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.timeoutID = undefined;
    }

    connectedCallback() {
      this.shadowRoot.appendChild(template.content.cloneNode(true));
      var org = this.orgId;
      var dc = this.dc.slice(4);
      var context = this.shadowRoot;
      var access_token = this.token;
      GetCallsInQueue({ token: access_token });

      function GetCallsInQueue(result) {
        access_token = result.token;
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("Authorization", "Bearer " + access_token);
        const currentTimeMs = Date.now().toString();
        const raw = JSON.stringify({
          query: `
{
  task(
    from: "1767874520000"
    to: "${currentTimeMs}"
     filter: {
      and: [
        { channelType: { equals: telephony } } 
        { isActive: { equals: true } }
        { status: { equals: "parked" } } 
        { direction: { equals: "inbound" } } 
        { 
            or: [
                { lastQueue: { name: { equals: "YOUR_VOICE_QUEUE1_NAME_HERE" } } }
                { lastQueue: { name: { equals: "YOUR_VOICE_QUEUE2_NAME_HERE" } } }
            ]
        }
      ]
    }
    aggregations: [{ field: "id", type: count, name: "NbCallsInQueue" }]
  ) {
    tasks {
      aggregation { name value }
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
          "https://api.wxcc-"+dc+".cisco.com/search?orgId=" + org,
          requestOptions
        )
          .then((response) => response.text())
          .then((result) => DisplayTasks(JSON.parse(result), context))
          .catch((error) => console.log("[NBAPPELSENFILE] - Erreur -> ", error));
      }

        function DisplayTasks(result, context) {
            console.log("NBAPPELSENFILE: résultat -> ", result);
            const tableContainer = context.getElementById("table-container");

            if (!result.data || !result.data.task || !result.data.task.tasks) {
                // tableContainer.innerHTML = "<p>Rien retourné.</p>";
                return;
            }

            const tasks = result.data.task.tasks;
            console.log("NBAPPELSENFILE: Tâches trouvées -> ", tasks);
            tableContainer.innerHTML = generateTaskTable(tasks);
        }

        function generateTaskTable(tasks) {
            let nbAppelsEnFile = 0;
            tasks.forEach((task) => {
                const aggregation = task.aggregation.find(a => a.name === "NbCallsInQueue");
                if (aggregation) {
                    nbAppelsEnFile += aggregation.value;
                    console.log("NBAPPELSENFILE: Nb appels en file -> ", nbAppelsEnFile);
                }
            });
            let table = '';
            let isAlert = nbAppelsEnFile > 0;
            let bgColor = isAlert ? "#e53935" : "#43a047";

table += `
<span style="background:${bgColor}; color:white; padding:2px 8px; border-radius:10px; font-family:Roboto, sans-serif; font-size:12px; font-weight:bold; display:inline-flex; align-items:center; gap:4px;">
<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="white" viewBox="0 0 24 24">
<path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 
1 0 011-.27c1.12.37 2.33.57 3.59.57a1 
1 0 011 1V21a1 1 0 01-1 1C10.07 22 2 13.93 2 
4a1 1 0 011-1h3.5a1 1 0 011 1c0 
1.26.2 2.47.57 3.59a1 1 0 01-.25 1l-2.2 2.2z"/>
</svg>${nbAppelsEnFile}
</span>
`;
            return table;
        }
        // Rafraîchissement toutes les 5 secondes
        this.intervalID = setInterval(() => {
            GetCallsInQueue({ token: access_token });
        }, 5000);
    }

    disconnectedCallback() {
        if (this.intervalID) {
            clearInterval(this.intervalID);
        }
    }  
  }
  customElements.define("nb-appels-en-file", NbAppelsEnFile);
})();