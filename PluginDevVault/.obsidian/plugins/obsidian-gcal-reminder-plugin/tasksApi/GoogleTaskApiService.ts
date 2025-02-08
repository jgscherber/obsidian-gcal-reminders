import { GoogleApiError } from "googleApi/GoogleApiError";
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
        const bearerToken = await getGoogleAuthToken(this.settings); // TODO pull from settings
        if (!bearerToken) {
            return null;
        }
        // if(taskId === ""){
        //     throw new GoogleApiError("Could not create Google Event because no default calendar selected in Settings", null, 999, {error: "No calendar set"})    
        // }
    
        const callResponse = await callRequest(
            `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`,
            'POST',
            googleTask,
            bearerToken)

        // Cast type with erorr checking
        const createdTaskResponse = callResponse as GoogleTaskResponse;
        if(!createdTaskResponse.id){
            // throw new GoogleApiError("Error creating task", null, 500, {error: "No ID returned"})
        }



        return createdTaskResponse;
    }
}
