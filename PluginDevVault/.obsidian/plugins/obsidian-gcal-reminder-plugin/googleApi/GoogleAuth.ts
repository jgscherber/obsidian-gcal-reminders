/* eslint-disable @typescript-eslint/no-var-requires */


/*
	This file is used to authenticate the user to the google google cloud service 
	and refresh the access token if needed 
*/



// import {
// 	settingsAreCompleteAndLoggedIn,
// } from "../view/GoogleCalendarSettingTab";
import {
	getAccessToken,
	getExpirationTime,
	getRefreshToken,
	setAccessToken,
	setExpirationTime,
	setRefreshToken,
} from "../helper/LocalStorage";
import * as option from 'fp-ts/Option';
import { Notice, Platform, requestUrl } from "obsidian";
import { createNotice } from '../helper/NoticeHelper';
// import { log } from '../helper/log';
import { IGoogleCalendarPluginSettings } from '../types/IGoogleCalendarPluginSettings';

let _lastRefreshTryMoment = window.moment().subtract(100, "seconds");
interface IAuthSession {server: string; verifier: string; challenge: string; state: string; }
let _authSession : IAuthSession = {server: '', verifier: '', challenge: '', state:''};


function generateState(): string {
	return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
  
async function generateVerifier(): Promise<string> {
	const array = new Uint32Array(56);
	await window.crypto.getRandomValues(array);
	return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
}
  
async function generateChallenge(verifier: string): Promise<string> {
	const data = new TextEncoder().encode(verifier);
	const hash = await window.crypto.subtle.digest('SHA-256', data);
	return btoa(String.fromCharCode(...new Uint8Array(hash)))
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');
}


export function TryGetAccessToken(): option.Option<string> {
	// TODO calling this thrice in this method????
    //Check if the token exists
	if (!getAccessToken() || getAccessToken() == "") return option.none;

	//Check if Expiration time is not set or default 0
	if (!getExpirationTime()) return option.none;

	//Check if Expiration time is set to text
	if (isNaN(getExpirationTime())) return option.none

	//Check if Expiration time is in the past so the token is expired
	if (getExpirationTime() < +new Date()) return option.none;

	return option.some(getAccessToken());
}

const refreshAccessToken = async (settings: IGoogleCalendarPluginSettings)
    : Promise<option.Option<string>> => {

	// if(lastRefreshTryMoment.diff(window.moment(), "seconds") < 60){
	// 	return;
	// }

	let refreshBody = {
		grant_type: "refresh_token",
		client_id: settings.googleClientId?.trim(),
		client_secret: settings.googleClientSecret?.trim(),
		refresh_token: getRefreshToken(),
	};

	const {json: tokenData} = await requestUrl({
		method: 'POST',
		url: 'https://oauth2.googleapis.com/token',
		headers: {'content-type': 'application/json'},
		body: JSON.stringify(refreshBody)
	})

	if (!tokenData) {
		createNotice("Error while refreshing authentication");
		return option.none;
	}
	
	//Save new Access token and Expiration Time
	setAccessToken(tokenData.access_token);
	setExpirationTime(+new Date() + tokenData.expires_in * 1000);
	return option.some(tokenData.access_token);
}

// TODO prettier config of braces on own line....
const exchangeCodeForTokenCustom = async (
    settings: IGoogleCalendarPluginSettings,
    userProvidedCode: string): Promise<any> =>
{
	// const url = `https://oauth2.googleapis.com/token`
    //     + `?grant_type=authorization_code`
    //     + `&client_id=${settings.googleClientId?.trim()}`
    //     + `&client_secret=${settings.googleClientSecret?.trim()}`
    //     + `&code_verifier=${verifier}`
    //     + `&code=${code}`
    //     + `&state=${state}`
    //     + `&redirect_uri=${isMobile ? REDIRECT_URL_MOBILE :REDIRECT_URL}`

	// const response = await fetch(url,{
	// 	method: 'POST',
	// 	headers: {'content-type': 'application/x-www-form-urlencoded'},
	// });

    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams({
        code: userProvidedCode,
        client_id: settings.googleClientId?.trim(),
        client_secret: settings.googleClientSecret?.trim(),
        redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
        grant_type: 'authorization_code',
        code_verifier: _authSession.verifier,
    });

    const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString()
    });

	return response.json();
}

/**
 * Function the get the access token used in every request to the Google Calendar API
 * 
 * Function will check if a access token exists and if its still valid
 * if not it will request a new access token using the refresh token
 * 
 * @returns A valid access Token
 */
export async function getGoogleAuthToken(
    settings: IGoogleCalendarPluginSettings): Promise<option.Option<string>>
{
	// Check if refresh token is set
	// TODO if (!settingsAreCompleteAndLoggedIn()) returna;

	let accessToken = TryGetAccessToken();

	//Check if the Access token is still valid or if it needs to be refreshed
	if (option.isNone(accessToken)) {
		accessToken = await refreshAccessToken(settings);		
	}

	// Check if refresh of access token did not work
	if(!accessToken) return option.none;

	return accessToken;
}


export async function StartLoginGoogleMobile(
    settings: IGoogleCalendarPluginSettings) : Promise<void>
{

	if(!_authSession.state){
		_authSession.state = generateState();
		_authSession.verifier = await generateVerifier();
		_authSession.challenge = await generateChallenge(_authSession.verifier);
	}

	// const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
	// + `?client_id=${CLIENT_ID}`
	// + `&response_type=code`
	// + `&redirect_uri=${REDIRECT_URL_MOBILE}`
	// + `&prompt=consent`
	// + `&access_type=offline`
	// + `&state=${_authSession.state}`
	// + `&code_challenge=${_authSession.challenge}`
	// + `&code_challenge_method=S256`
	// + `&scope=https://www.googleapis.com/auth/calendar.readonly%20https://www.googleapis.com/auth/calendar.events`;

    const scope = 'https://www.googleapis.com/auth/tasks' // TODO better place
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth`
        + `?client_id=${settings.googleClientId?.trim()}`
        + `&response_type=code`
        + `&scope=${encodeURIComponent(scope)}`
        + `&redirect_uri=urn:ietf:wg:oauth:2.0:oob`
        + `&state=${_authSession.state}`
        + `&code_challenge=${_authSession.challenge}`
        + `&code_challenge_method=S256`
        + `&access_type=offline`

    console.log(authUrl);
	window.open(authUrl);
}

export async function FinishLoginGoogleMobile(
    userProvidedCode:string,
    settings: IGoogleCalendarPluginSettings,
    successCallback: () => any
    ): Promise<void>
{
	const token = await exchangeCodeForTokenCustom(
        settings,
        userProvidedCode);

	if(token?.refresh_token) {
		setRefreshToken(token.refresh_token);
		setAccessToken(token.access_token);
		setExpirationTime(+new Date() + token.expires_in * 1000);

		new Notice("Login successful!");
		successCallback();
	}

    // Auth process is done, clear values
	_authSession = {server: '', verifier: '', challenge: '', state:''};
}