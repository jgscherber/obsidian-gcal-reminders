
import type { ListOptions, IGoogleCalendarPluginApi, GoogleEvent } from '../helper/types';
import { googleListEvents } from "../calendarApi/GoogleListEvents";
import { googleGetEvent } from "../calendarApi/GoogleGetEvent";
import { googleListCalendars } from '../calendarApi/GoogleListCalendars';
import { googleCreateEvent } from '../calendarApi/GoogleCreateEvent';
import { googleDeleteEvent } from '../calendarApi/GoogleDeleteEvent';
import { googleUpdateEvent } from '../calendarApi/GoogleUpdateEvent';
import { createNoteFromEvent } from "../helper/AutoEventNoteCreator";

export class GoogleCalendarPluginApi {

    constructor() {
    }

    public make(): IGoogleCalendarPluginApi {
        return {
            getCalendars: () => googleListCalendars(),
            getEvent: (id:string, calendarId:string) => googleGetEvent(id, calendarId),
            getEvents: (input:ListOptions) => googleListEvents(input),
            createEvent: (input:GoogleEvent) => googleCreateEvent(input),
            deleteEvent: (event:GoogleEvent, deleteAllOccurrences = false ) => googleDeleteEvent(event, deleteAllOccurrences),
            updateEvent: (event:GoogleEvent, updateAllOccurrences = false) => googleUpdateEvent(event, updateAllOccurrences),
            createEventNote: (event: GoogleEvent, eventDirectory: string, templatePath:string) => createNoteFromEvent(event, eventDirectory, templatePath),
        }
    }
}