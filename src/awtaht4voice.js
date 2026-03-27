(function () {
  const template = document.createElement("template");
  template.innerHTML = `<div id="table-container"></div>`;

  class StatsEnFile extends HTMLElement {
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
        const todayAt6 = new Date();
        todayAt6.setHours(6, 0, 0, 0);
        const ceMatin6h = todayAt6.getTime();
        console.log("[STATFILES] - ce matin 6h -> ", ceMatin6h);

        const raw = JSON.stringify({
          query: `
{
  task(
    from: "${ceMatin6h}"
    to: "${currentTimeMs}"
    timeComparator: createdTime
    filter: {
      and: [
        { channelType: { equals: telephony } }
        { direction: { equals: "inbound" } }
        { 
            or: [
                { lastQueue: { name: { equals: "Q_Voice_NAME1" } } }
                { lastQueue: { name: { equals: "Q_Voice_NAME1" } } }
            ]
        }
      ]
    }
    aggregations: [
      { field: "queueDuration", type: average, name: "AverageQueueTime" }
      { field: "totalDuration", type: average, name: "AHT"}
    ]
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
          .catch((error) => console.log("[STATFILES] - ERROR - ", error));
      }

        function DisplayTasks(result, context) {
            console.log("[STATFILES]: result", result);
            const tableContainer = context.getElementById("table-container");

            if (!result.data || !result.data.task || !result.data.task.tasks) {
                // tableContainer.innerHTML = "<p>Rien retourné.</p>";
                return;
            }

            const tasks = result.data.task.tasks;
            console.log("[STATFILES]: tasks -> ", tasks);
            tableContainer.innerHTML = generateTaskTable(tasks);
        }

        function generateTaskTable(tasks) {
            let AverageQueueTime = 0;
            let AHT = 0;
            tasks.forEach((task) => {
                const aggregation = task.aggregation.find(a => a.name === "AverageQueueTime");
                if (aggregation) {
                    AverageQueueTime += aggregation.value;
                    console.log("[STATFILES]: ici -> AverageQueueTime ", AverageQueueTime);
                }
                const aggregation2 = task.aggregation.find(a => a.name === "AHT");
                if (aggregation2) {
                    AHT += aggregation2.value;
                    console.log("[STATFILES]: ici AHT-> ", AHT);
                }

            });
let table = `<div style="display:flex; gap:8px; align-items:center;">`;
            let isAlert = AverageQueueTime > 120000;
            let bgColor = isAlert ? "#e53935" : "#43a047";
            let isAlert2 = AHT > 150000;
            let bgColor2 = isAlert2 ? "#e53935" : "#43a047";


table += `<span style="background:${bgColor}; color:white; padding:2px 8px; border-radius:10px; font-family:Roboto, sans-serif; font-size:12px; font-weight:bold; display:inline-flex; align-items:center; gap:4px;">
<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24">
  <circle cx="12" cy="13" r="7"/>
  <path d="M12 13l3-2"/>
  <path d="M9 2h6"/>
</svg>
${formatMs(AverageQueueTime)}
</span>`;

table += `<span style="background:${bgColor2}; color:white; padding:2px 8px; border-radius:10px; font-family:Roboto, sans-serif; font-size:12px; font-weight:bold; display:inline-flex; align-items:center; gap:4px;">
DMT : ${formatMs(AHT)}
</span>`;
table += `</div>`;



            return table;
        }

        function formatMs(ms) {
            const totalSeconds = Math.floor(ms / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes}m${seconds.toString().padStart(2, '0')}s`;
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
  customElements.define("stats-en-file", StatsEnFile);
})();