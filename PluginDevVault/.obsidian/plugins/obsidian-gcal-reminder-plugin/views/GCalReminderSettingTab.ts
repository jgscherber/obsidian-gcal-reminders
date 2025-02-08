export {}
// export class GCalReminderSettingTab extends PluginSettingTab {
//     plugin: GCalReminderPlugin;

//     constructor(app: App, plugin: GCalReminderPlugin) {
//         super(app, plugin);
//         this.plugin = plugin;
//     }

//     display(): void {
//         const { containerEl } = this;
//         containerEl.empty();

//         new Setting(containerEl)
//             .setName('Google Client ID')
//             .setDesc('Client ID from Google Cloud Console')
//             .addText(text => text
//                 .setPlaceholder('Enter client ID')
//                 .setValue(this.plugin.settings.googleClientId)
//                 .onChange(async (value) => {
//                     this.plugin.settings.googleClientId = value;
//                     await this.plugin.saveSettings();
//                 }));

//         new Setting(containerEl)
//             .setName('Google Client Secret')
//             .setDesc('Client Secret from Google Cloud Console')
//             .addText(text => text
//                 .setPlaceholder('Enter client secret')
//                 .setValue(this.plugin.settings.googleClientSecret)
//                 .onChange(async (value) => {
//                     this.plugin.settings.googleClientSecret = value;
//                     await this.plugin.saveSettings();
//                 }));

//         new Setting(containerEl)
//             .setName('Authentication')
//             .setDesc('Connect to Google Calendar')
//             .addButton(button => button
//                 .setButtonText(this.plugin.settings.googleRefreshToken ? 'Re-authenticate' : 'Connect to Google Calendar')
//                 .onClick(() => {
//                     if (this.plugin.settings.googleClientId && this.plugin.settings.googleClientSecret) {
//                         this.plugin.initiateAuth();
//                     } else {
//                         new Notice('Please enter Client ID and Client Secret first');
//                     }
//                 }));
//     }
// }