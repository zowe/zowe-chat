/* generate a passticket */

/*
 * To compile:
 *
 * $ xlc -q64 -qin=all:nostp -opass genPassticket.c
 *
 */

#ifndef __64BIT__
#error "Program must be compiled as 64-bit, using LP64 option"
#endif

#include <stdint.h>
#include <stdio.h>
#include <string.h>

#pragma linkage(IRRSGS64, OS)
uint32_t IRRSGS64(uint32_t *pnParms,
                  void *workArea,
                  uint32_t *palet1,
                  uint32_t *psafRc,
                  uint32_t *palet2,
                  uint32_t *pracfRc,
                  uint32_t *palet3,
                  uint32_t *pracfReason,
                  uint32_t *poptionWord,
                  uint16_t *pfnCode,
                  uint32_t *pfnParmCount,
                  void **fnParm);

typedef struct strBlock
{
    uint32_t length;
    uint32_t reserved;
    uint8_t *address;
};

int main(int argc, char **argv)
{
    uint8_t ticket[9], workArea[1024];
    uint32_t nParms, safRc, racfRc, racfReason, optionWord, a1, a2, a3,
        subFnCode, fnParmCount, rc;
    uint16_t fnCode;
    void *fnParm[4];
    struct strBlock sbUser, sbAppl, sbTicket;

    if (argc != 3)
    {
        printf("Usage: pass userID application\n");
        return 8;
    }

    /* load string blocks */
    sbUser.length = (uint32_t)(strlen(argv[1]) < 8 ? strlen(argv[1]) : 8);
    sbUser.reserved = 0;
    sbUser.address = argv[1];
    sbAppl.length = (uint32_t)(strlen(argv[2]) < 8 ? strlen(argv[2]) : 8);
    sbAppl.reserved = 0;
    sbAppl.address = argv[2];
    sbTicket.length = 8;
    sbTicket.reserved = 0;
    sbTicket.address = ticket;

    /* prepare parameters for service call */
    nParms = 12;
    a1 = a2 = a3 = 0; /* all return codes in primary address space */
    optionWord = 0;   /* reserved */
    fnCode = 3;       /* Passticket function */
    subFnCode = 1;    /* Generate passticket */
    fnParmCount = 4;
    fnParm[0] = &subFnCode;
    fnParm[1] = &sbTicket;
    fnParm[2] = &sbUser;
    fnParm[3] = &sbAppl;

    rc = IRRSGS64(&nParms,
                  workArea,
                  &a1, &safRc,
                  &a2, &racfRc,
                  &a3, &racfReason,
                  &optionWord,
                  &fnCode,
                  &fnParmCount,
                  fnParm);

    if (safRc == 0)
    {
        ticket[8] = '\0';
        printf("{\n \"safRc\": %d,\n \"racfRc\": %d,\n \"racfReason\": %d,\n \"passticket\": \"%s\"\n}\n",
               safRc, racfRc, racfReason, ticket);
    }
    else
    {
        printf("{\n \"safRc\": %d,\n \"racfRc\": %d,\n \"racfReason\": %d\n}\n",
               safRc, racfRc, racfReason);
    }

    return (int)rc;
}