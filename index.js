const fs = require("fs").promises
const path = require("path")
const process = require("process")
const { authenticate } = require("@google-cloud/local-auth")
const { google } = require("googleapis")

// If modifying these scopes, delete token.json.
// const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]
const SCOPES = ["https://www.googleapis.com/auth/calendar"]
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), "token.json")
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json")

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
    try {
        const content = await fs.readFile(TOKEN_PATH)
        const credentials = JSON.parse(content)
        return google.auth.fromJSON(credentials)
    } catch (err) {
        return null
    }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
    const content = await fs.readFile(CREDENTIALS_PATH)
    const keys = JSON.parse(content)
    const key = keys.installed || keys.web
    const payload = JSON.stringify({
        type: "authorized_user",
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    })
    await fs.writeFile(TOKEN_PATH, payload)
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
    let client = await loadSavedCredentialsIfExist()
    if (client) {
        return client
    }
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    })
    if (client.credentials) {
        await saveCredentials(client)
    }
    return client
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listEvents(auth) {
    const calendar = google.calendar({ version: "v3", auth })
    const res = await calendar.events.list({
        calendarId: "primary",
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: "startTime",
    })
    const events = res.data.items
    if (!events || events.length === 0) {
        console.log("No upcoming events found.")
        return
    }
    console.log("Upcoming 10 events:")
    events.map((event, i) => {
        const start = event.start.dateTime || event.start.date
        console.log(`${start} - ${event.summary}`)
    })
}

function createEvents(auth) {
    const calendar = google.calendar({ version: "v3", auth })

    const eventsToAdd = [
        // {
        //     date: "02/10/2022",
        //     hour: "10:30",
        // },
        // {
        //     date: "xxx",
        //     hour: "xxx",
        // },
    ]

    const myEvents = eventsToAdd.map(eventToAdd => {
        const splitedDate = eventToAdd.date.split("/")
        const YYYY = splitedDate[2]
        const MM = splitedDate[1]
        const DD = splitedDate[0]

        const splitedHour = eventToAdd.hour.split(":")
        const hour = parseInt(splitedHour[0], 10)
        const minute = splitedHour[1]

        return {
            summary: "Date à retenir voir calendrier catéchisme 2022/2023",
            start: {
                dateTime: `${YYYY}-${MM}-${DD}T${hour}:${minute}:00`,
                timeZone: "Europe/Paris",
            },
            end: {
                dateTime: `${YYYY}-${MM}-${DD}T${hour + 1}:${minute}:00`,
                timeZone: "Europe/Paris",
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: "popup", minutes: 60 * 1 },
                    { method: "popup", minutes: 60 * 24 },
                ],
            },
        }
    })

    myEvents.forEach((event, index) => {
        setTimeout(() => {
            calendar.events.insert(
                {
                    auth: auth,
                    // calendarId: "primary",
                    calendarId:
                        "npnbla0g5trn5ne79vkpk7ia8k@group.calendar.google.com", // Garde

                    // calendarId:
                    //     "41mf84t39i2u0cvttlnqbqdcl0@group.calendar.google.com", // taches routinières
                    resource: event,
                },
                function (err, event) {
                    if (err) {
                        console.log(
                            "There was an error contacting the Calendar service: " +
                                err
                        )
                        return
                    }
                    console.log(
                        "Event created: %s",
                        event.data.summary,
                        event.data.start.dateTime,
                        event.data.htmlLink
                    )
                }
            )
        }, index * 2000)
    })
}

// authorize().then(listEvents).catch(console.error)
authorize().then(createEvents).catch(console.error)
