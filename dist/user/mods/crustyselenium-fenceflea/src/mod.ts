import type { DependencyContainer } from "tsyringe";
import type { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import type { IPreSptLoadMod } from "@spt/models/external/IPreSptLoadMod";
import type { DatabaseServer } from "@spt/servers/DatabaseServer";
import type { IDatabaseTables } from "@spt/models/spt/server/IDatabaseTables";
import type { ProfileHelper } from "@spt/helpers/ProfileHelper";
import type { IPmcData } from "@spt/models/eft/common/IPmcData";
import type { ILogger } from "@spt/models/spt/utils/ILogger";
import type { StaticRouterModService } from "@spt/services/mod/staticRouter/StaticRouterModService";
import { QuestStatus } from "@spt/models/enums/QuestStatus";
// comments are for chumps (if you have questions about code dm me)
class FenceFlea implements IPostDBLoadMod, IPreSptLoadMod
{
    private logger: ILogger;
    private databaseServer: DatabaseServer;
    private profileHelper: ProfileHelper;
    private tables: IDatabaseTables;

    private modConfig = require("../config/config.json");

    public postDBLoad(container: DependencyContainer): void
    {
        this.databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
        this.profileHelper = container.resolve<ProfileHelper>("ProfileHelper");
        this.tables = this.databaseServer.getTables();
        if (this.modConfig.enabled)
        {
            this.tables.globals.config.RagFair.minUserLevel = 100;
            this.logger.log("[FenceFlea] Disabling flea until profile can be confirmed.","white");
        }
    }

    public preSptLoad(container: DependencyContainer): void 
    {
        this.logger = container.resolve<ILogger>("WinstonLogger");

        const staticRouterModService = container.resolve<StaticRouterModService>("StaticRouterModService");

        if (this.modConfig.enabled)
        {
            staticRouterModService.registerStaticRouter(
                "checkFlea",
                [
                    {
                        // update on client game start
                        url: "/client/game/start",
                        action: async (url:string, info, sessionId:string, output:string) =>
                        {
                            const currentProfile : IPmcData = this.profileHelper.getPmcProfile(sessionId);
                            this.checkQuestCondition(currentProfile);
                            return output;
                        }
                    },
                    {
                        // update on flea refresh
                        url: "/client/ragfair/find",
                        action: async (url:string, info, sessionId:string, output:string) =>
                        {
                            const currentProfile : IPmcData = this.profileHelper.getPmcProfile(sessionId);
                            this.checkQuestCondition(currentProfile);
                            return output;
                        }
                    }
                ], "spt"
            );
        } 
    }

    private checkQuestCondition (pmcData: IPmcData)
    {   
        if (pmcData.Quests === undefined)
        {
            this.logger.log("[FenceFlea] Profile is empty. New or broken profile, flea is disabled.", "white");
            this.tables.globals.config.RagFair.minUserLevel = 100;
            return
        }
        for (const quest of pmcData.Quests)
        {
            if (quest.qid === this.modConfig.questIdForFlea)
            {
                if (quest.status === QuestStatus.Success)
                {
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
export const mod = new FenceFlea();
