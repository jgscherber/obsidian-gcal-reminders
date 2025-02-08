import { GoogleApiError } from "googleApi/GoogleApiError";
import * as option from 'fp-ts/Option';
import { GetGoogleAuthToken } from "googleApi/GoogleAuth";
import { callRequest } from "helper/RequestWrapper";
import { IGoogleCalendarPluginSettings } from "types/IGoogleCalendarPluginSettings";
import { GoogleTask, GoogleTaskResponse, TaskListsResponse } from "types/types";

export class GoogleTaskApiService {
    settings: IGoogleCalendarPluginSettings;
    
    constructor(
        settings: IGoogleCalendarPluginSettings)
    {
        this.settings = settings;
        
    }

    async GetTaskListId() : Promise<option.Option<string>> {
        const bearerTokenOption = await GetGoogleAuthToken(this.settings);
        if (!option.isSome(bearerTokenOption)) {
            return option.none;
        }
        // if(taskId === ""){
        //     throw new GoogleApiError("Could not create Google Event because no default calendar selected in Settings", null, 999, {error: "No calendar set"})    
        // }
        const bearerToken = bearerTokenOption.value;

        console.log("Bearer token", bearerToken);
        const taskListReponse : TaskListsResponse = await callRequest(
            'https://tasks.googleapis.com/tasks/v1/users/@me/lists',
            'GET',
            null,
            bearerToken);

        const taskListName = this.settings.googleTaskListName;
        for (const taskList of taskListReponse.items)
        {
            if (taskList.title.toLowerCase() === taskListName.toLowerCase())
            {
                return option.some(taskList.id);
            }
        }

        console.log("No task list found with name", taskListName);
        return option.none;
    }

    async Create(googleTask: GoogleTask): Promise<GoogleTaskResponse | null> {
        // TODO validate settings

        let taskListId = this.settings.googleTaskListId;
        if (!taskListId) {
            const taskListIdOption = await this.GetTaskListId();
            if (!option.isSome(taskListIdOption)) {
                return null;
            }

            taskListId = taskListIdOption.value;
        }

        const bearerTokenOption = await GetGoogleAuthToken(this.settings);
        if (!option.isSome(bearerTokenOption)) {
            return null;
        }
        // if(taskId === ""){
        //     throw new GoogleApiError("Could not create Google Event because no default calendar selected in Settings", null, 999, {error: "No calendar set"})    
        // }
        const bearerToken = bearerTokenOption.value;

        console.log("Creating task", googleTask);
        console.log("Bearer token", bearerToken);
        console.log("Task", googleTask);
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
