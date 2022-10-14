const imperative = require("@zowe/imperative")
const ProfileInfo = imperative.ProfileInfo;
const uss = require("@zowe/zos-uss-for-zowe-sdk")
const Shell = uss.Shell
const SshSession = uss.SshSession;
const zosmf = require("@zowe/zosmf-for-zowe-sdk")
const ZosmfSession = zosmf.ZosmfSession;
const files = require("@zowe/zos-files-for-zowe-sdk");
const fs = require("fs")
const { fstat } = require("fs");
const sep = require("path").sep;

async function main() {
    // Load connection info from default SSH profile
    const profInfo = new ProfileInfo("zowe");
    await profInfo.readProfilesFromDisk({
        projectDir: ".",
    });
    const sshProfAttrs = profInfo.getDefaultProfile("ssh");
    console.log(sshProfAttrs)
    const sshMergedArgs = profInfo.mergeArgsForProfile(sshProfAttrs, { getSecureVals: true });
    const session = new SshSession(ProfileInfo.initSessCfg(sshMergedArgs.knownArgs));

    const zosmfProfAttrs = profInfo.getDefaultProfile("zosmf");
    const zosmfMergedArgs = profInfo.mergeArgsForProfile(zosmfProfAttrs, { getSecureVals: true });
    const zosmfSession = ProfileInfo.createSession(zosmfMergedArgs.knownArgs);
    console.log("zosmf prof attrs")
    console.log(JSON.stringify(zosmfMergedArgs.knownArgs))
    await Shell.executeSsh(session, "mkdir -p /u/zowead6", (data) => {
        if (data.trim()) console.log(data);
    });

    await files.Upload.fileToUssFile(zosmfSession, `.${sep}passticket${sep}genPassticket.c`, `/u/zowead6/genPassticket.c`, {
        binary: false,
    })

    await Shell.executeSsh(session, "cd /u/zowead6 && xlc -q64 -qin=all:nostp -opassticket_bin genPassticket.c", (data) => {
        if (data.trim()) console.log(data);
    });

    await Shell.executeSsh(session, "extattr +a /u/zowead6/passticket_bin", (data) => {
        if (data.trim()) console.log(data);
    });

    await files.Download.ussFile(zosmfSession, `/u/zowead6/passticket_bin`, {
        binary: true,
        file: `.build${sep}passticket_bin`
    })
}


main()