const todoist = require("https://github.com/pipedream/todoist/todoist.app.js");

module.exports = {
  name: "Sync Resources",
  description: "Emit an event when select resources are created or modified",
  version: "0.0.1",
  props: {
    todoist,
    includeResourceTypes: { propDefinition: [todoist, "includeResourceTypes"] },
    excludeResourceTypes: { propDefinition: [todoist, "excludeResourceTypes"] },
    timer: {
      type: "$.interface.timer",
      default: {
        intervalSeconds: 60 * 5,
      },
    },
    db: "$.service.db",
  },
  async run(event) {
    const sync_token = this.db.get("sync_token") || '*'
    
    let emitCount = 0

    const result = await this.todoist.sync({
      resource_types: JSON.stringify(this.includeResourceTypes),
      sync_token,
    })

    for (const property in result) {
      if(Array.isArray(result[property])) {
        result[property].forEach(element => {
          let data = {}
          data.resource = property
          data.data = element
          this.$emit(data, {
            summary: property
          })
          emitCount++
        })
      }
    }

    console.log(`Emitted ${emitCount} events.`)

    this.db.set("sync_token", result.sync_token)
  },
};
