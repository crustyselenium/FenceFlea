"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mod = void 0;
const QuestStatus_1 = require("C:/snapshot/project/obj/models/enums/QuestStatus");
class FenceFlea {
    logger;
    databaseServer;
    profileHelper;
    tables;
    modConfig = require("../config/config.json");
    postDBLoad(container) {
        this.databaseServer = container.resolve("DatabaseServer");
        this.profileHelper = container.resolve("ProfileHelper");
        this.tables = this.databaseServer.getTables();
        if (this.modConfig.enabled) {
            // Remove bag restrictions because bitcoin quest condition
            this.tables.globals.config.RestrictionsInRaid = [];
            this.tables.globals.config.RagFair.minUserLevel = 100;
            this.logger.log("[FenceFlea] Disabling flea until profile can be confirmed.", "white");
        }
    }
    preSptLoad(container) {
        this.logger = container.resolve("WinstonLogger");
        const staticRouterModService = container.resolve("StaticRouterModService");
        if (this.modConfig.enabled) {
            staticRouterModService.registerStaticRouter("checkFlea", [
                {
                    // update on client game start
                    url: "/client/game/start",
                    action: async (url, info, sessionId, output) => {
                        const currentProfile = this.profileHelper.getPmcProfile(sessionId);
                        this.checkQuestCondition(currentProfile);
                        return output;
                    }
                },
                {
                    // update on flea refresh
                    url: "/client/ragfair/find",
                    action: async (url, info, sessionId, output) => {
                        const currentProfile = this.profileHelper.getPmcProfile(sessionId);
                        this.checkQuestCondition(currentProfile);
                        return output;
                    }
                }
            ], "spt");
        }
    }
    checkQuestCondition(pmcData) {
        if (pmcData.Quests === undefined) {
            this.logger.log("[FenceFlea] Profile is empty. New or broken profile, flea is disabled.", "white");
            this.tables.globals.config.RagFair.minUserLevel = 100;
            return;
        }
        for (const quest of pmcData.Quests) {
            if (quest.qid === this.modConfig.questIdForFlea) {
                if (quest.status === QuestStatus_1.QuestStatus.Success) {
                    this.tables.globals.config.RagFair.minUserLevel = 1;
                    this.logger.log("[FenceFlea] Flea quest has been completed, enabling flea. Refresh if you can't see offers.", "white");
                    return;
                }
                this.tables.globals.config.RagFair.minUserLevel = 100;
                this.logger.log("[FenceFlea] Flea quest has not been completed, flea is disabled.", "white");
                return;
            }
        }
        this.tables.globals.config.RagFair.minUserLevel = 100;
        this.logger.log("[FenceFlea] Flea quest has not been found or completed, flea is disabled.", "white");
    }
}
exports.mod = new FenceFlea();
//# sourceMappingURL=mod.js.map