import { getGoogleAuthToken } from "../googleApi/GoogleAuth";
// import GoogleCalendarPlugin from "../GoogleCalendarPlugin";
import { GoogleApiError } from "../googleApi/GoogleApiError";
import { requestUrl } from "obsidian";
// import { log } from "./log";

export const callRequest = async (
        url: string,
        method: string,
        body: any,
        bearerToken: string,
        // TODO pass auth settings in here
        noAuth = false): Promise<any> =>
    {

        // Log parameters
        console.log("URL", url);
        console.log("Method", method);
        console.log("Body", body);
        console.log("Bearer Token", bearerToken);
        console.log("No Auth", noAuth);
        
        const requestHeaders: any = { 'Content-Type': 'application/json' };
        if (noAuth == false) {
            const bearer = bearerToken;
            if (!bearer) {
                throw new GoogleApiError("Error Google API request", 
                    { method, url, body, },
                    401,
                    {error: "Missing Auth Token"}
                );
            }
            requestHeaders['Authorization'] = 'Bearer ' + bearer;
        }

        //Normal request
        let response;
        try { 
            response = await requestUrl({
                method: method,
                url: url,
                body: body ? JSON.stringify(body) : "",
                headers: requestHeaders,
                throw: false,
            });
        }catch (error) {
            if(response) {
                console.log("1", response);
                throw new GoogleApiError("Error Google API request", 
                    { method, url, body, },
                    response.status,
                    (await response.json()),
                );
            } else {
                console.log("2", response);
                throw new GoogleApiError("Error Google API request", 
                { method, url, body, },
                500,
                {error: "Unknown Error"},
            );
            }
        }

        if (response.status >= 300) {
                console.log("3", response);
                throw new GoogleApiError("Error Google API request", 
                { method, url, body, },
                response.status,
                response.json,
            );
        }

        // For to indicate success because the response is empty
        if (method.toLowerCase() == "delete") {
            return { status: "success" };
        }

        return (await response.json);
}
