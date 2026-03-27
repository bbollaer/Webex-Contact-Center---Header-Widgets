(function () {
  const template = document.createElement("template");
  template.innerHTML = `<div id="table-container"></div>`;

  class EmailEnFile14j extends HTMLElement {
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
        const nowMs = Date.now();
        const jMinus14Ms = (nowMs - 14 * 24 * 60 * 60 * 1000).toString();
        console.log("[STOCKEMAIL] - Now-14j -> ", jMinus14Ms);
        const raw = JSON.stringify({
          query: `
{
  task(
    from: "${jMinus14Ms}"
    to: "${currentTimeMs}"
    timeComparator: createdTime
    filter: {
      and: [
        { channelType: { equals: email } }
        { status: { equals: "parked" } } 
        { direction: { equals: "inbound" } }
        { lastQueue: { name: { contains: "YOUR_EMAIL_QUEUE_NAME_HERE" } } }   
      ]
    }
    aggregations: [{ field: "id", type: count, name: "TotalStock" }]
  ) {
    tasks { aggregation { name value }
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
          .catch((error) => console.log("[STOCKEMAIL] - ERROR - ", error));
      }

        function DisplayTasks(result, context) {
            console.log("[STOCKEMAIL]: result", result);
            const tableContainer = context.getElementById("table-container");

            if (!result.data || !result.data.task || !result.data.task.tasks) {
                console.log("[STOCKEMAIL]: rien en file d'attente sur ces derniers 14 jours");
                return;
            }

            const tasks = result.data.task.tasks;
            console.log("[STOCKEMAIL]: tasks -> ", tasks);
            tableContainer.innerHTML = generateTaskTable(tasks);
        }

        function generateTaskTable(tasks) {
            let EmailInQueue = 0;
            tasks.forEach((task) => {
                const aggregation = task.aggregation.find(a => a.name === "TotalStock");
                if (aggregation) {
                    EmailInQueue += aggregation.value;
                    console.log("[STOCKEMAIL]: ici -> EmailInQueue ", EmailInQueue);
                }
            });
            let table = `<div style="display:flex; gap:8px; align-items:center;"><span style="background:#000080; color:white; padding:2px 8px; border-radius:10px; font-family:Roboto, sans-serif; font-size:12px; font-weight:bold; display:inline-flex; align-items:center; gap:4px;">
<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24">
<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>${EmailInQueue}</span>`;
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
  customElements.define("stock-email-14j", EmailEnFile14j);
})();