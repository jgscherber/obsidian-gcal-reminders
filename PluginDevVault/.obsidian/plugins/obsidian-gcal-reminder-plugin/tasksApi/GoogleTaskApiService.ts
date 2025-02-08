import { GoogleApiError } from "googleApi/GoogleApiError";
import * as option from 'fp-ts/Option';
import { getGoogleAuthToken } from "googleApi/GoogleAuth";
import { callRequest } from "helper/RequestWrapper";
import { IGoogleCalendarPluginSettings } from "types/IGoogleCalendarPluginSettings";
import { GoogleTask, GoogleTaskResponse } from "types/types";

export class GoogleTaskApiService {
    settings: IGoogleCalendarPluginSettings;
    
    constructor(
        settings: IGoogleCalendarPluginSettings)
    {
        this.settings = settings;
        
    }

    async Create(googleTask: GoogleTask): Promise<GoogleTaskResponse | null> {
        // TODO validate settings

        // TODO pull from settings
        const taskListId = this.settings.googleTaskListId;
        const bearerTokenOption = await getGoogleAuthToken(this.settings); // TODO pull from settings
        if (!option.isSome(bearerTokenOption)) {
            return null;
        }
        // if(taskId === ""){
        //     throw new GoogleApiError("Could not create Google Event because no default calendar selected in Settings", null, 999, {error: "No calendar set"})    
        // }
        const bearerToken = bearerTokenOption.value;

        console.log("Creating task", googleTask);
        console.log("Bearer token", bearerToken);
        const callResponse = await callRequest(
            `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`,
            'POST',
            googleTask,
            bearerToken);

        console.log("Response", callResponse);

        // Cast type with erorr checking
        const createdTaskResponse = callResponse as GoogleTaskResponse;
        if(!createdTaskResponse.id){
            // throw new GoogleApiError("Error creating task", null, 500, {error: "No ID returned"})
        }



        return createdTaskResponse;
    }
}
