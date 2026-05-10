import { task } from "@trigger.dev/sdk"

export const helloWorld = task({
  id: "hello-world",
  run: async () => {
    console.log("Hello from Trigger.dev")
    return { success: true }
  },
})
