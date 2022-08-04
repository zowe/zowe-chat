import * as exec from "child_process";
import * as fs from "fs-extra";
import { Logger } from "../../utils/Logger";
import { SecurityConfig } from "../config/SecurityConfig";
import { ChatPrincipal } from "../user/ChatPrincipal";
import { ICredentialProvider } from "./ICredentialProvider";

export class PassticketProvider implements ICredentialProvider {

    private readonly securityConfig: SecurityConfig
    private readonly applId: string;
    private readonly mLog: Logger;

    constructor(configuration: SecurityConfig, log: Logger) {
        this.securityConfig = configuration
        this.mLog = log;
        this.applId = this.securityConfig.passticketOptions.applId

        let binFile = `${__dirname}/bin/genPtkt`

        // verify the passticket bin exists and has correct permissions
        if (!fs.existsSync(`${binFile}`)) {
            this.mLog.error("Passticket binary not found");
            throw new Error("Passticket binary not found");
        }

        let attrs: fs.Stats = fs.lstatSync(`${binFile}`);

        if (!attrs.isFile()) {
            this.mLog.error("Passticket binary is not a file");
            throw new Error("Passticket binary is not a file");
        }
        let attrMode = attrs.mode
        this.mLog.info(`Passticket binary mode: ${attrMode}`)

    }


    public getCredential(principal: ChatPrincipal): string {
        //TODO: convert to async call
        let stdOut = exec.execSync(`${__dirname}/bin/genPtkt ${this.applId} ${principal.getDistributedPrincipal()}`)
        let jsonFormat: PassticketData
        try {
            jsonFormat = JSON.parse(stdOut.toString())
        } catch (e) {
            this.mLog.error(`Non-fatal error encountered. Could not generate a passticket for user ${principal.getDistributedPrincipal()}`)
            this.mLog.debug(`Error: ${e}`)
            this.mLog.debug(`Passticket response: ${stdOut}`)
            return ""
        }

        if (!Object.keys(jsonFormat).includes("passticket")) {
            this.mLog.error(`Non-fatal error. Error generating passticket for user ${principal.getDistributedPrincipal()}`)
            this.mLog.error(`safRc: ${jsonFormat.safRc}, racfRc: ${jsonFormat.racfRc}, racfReason: ${jsonFormat.racfReason}`)
            return ""
        }

        return jsonFormat.passticket
    }
}

type PassticketData = {
    safRc: number,
    racfRc: number,
    racfReason: number,
    passticket?: string
}