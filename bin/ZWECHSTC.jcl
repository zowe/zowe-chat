//********************************************************************
//* This program and the accompanying materials are made available   *
//* under the terms of the Eclipse Public License v2.0 which         *
//* accompanies this distribution, and is available at               *
//* https://www.eclipse.org/legal/epl-v20.html                       *
//*                                                                  *
//* SPDX-License-Identifier: EPL-2.0                                 *
//*                                                                  *
//* Copyright Zowe Contributors                                      *
//********************************************************************
//*                                                                  *
//* ZOWE CHAT SERVER PROCEDURE                                       *
//*                                                                  *
//* This is a procedure to start the Zowe Chat Node Server.          *
//*                                                                  *
//* Invoke this procedure, specifying the root path where the        *
//* Zowe Chat server is installed on your system.                    *
//*                                                                  *
//*   S ZWESVSTC,INSTANCE='{{instance_directory}}'                   *
//*                                                                  *
//*                                                                  *
//********************************************************************
//ZWECHSTC   PROC INSTANCE='{{instance_directory}}'
//*-------------------------------------------------------------------
//* INSTANCE - The path to the HFS directory where the 
//*            zowe chat server is installed
//*-------------------------------------------------------------------
//EXPORT EXPORT SYMLIST=*
//ZWCHSTEP EXEC PGM=BPXBATSL,REGION=0M,TIME=NOLIMIT,
//  PARM='PGM /bin/sh &INSTANCE/bin/run-chat.sh'
//STDOUT   DD SYSOUT=*
//STDERR   DD SYSOUT=*
//*             PATHOPTS=ORDONLY
//*-------------------------------------------------------------------
//* Optional logging parameters that can be configured if required
//*-------------------------------------------------------------------
//*STDOUT   DD PATH='&SRVRPATH/std.out',
//*            PATHOPTS=(OWRONLY,OCREAT,OTRUNC),
//*            PATHMODE=SIRWXU
//*STDERR   DD PATH='&SRVRPATH/std.err',
//*            PATHOPTS=(OWRONLY,OCREAT,OTRUNC),
//*            PATHMODE=SIRWXU
