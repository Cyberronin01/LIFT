// Sample COBOL + Migrated TypeScript data — from Figma export
// In production these come from the backend, but kept for demo/fallback

export const SAMPLE_COBOL = `       IDENTIFICATION DIVISION.
       PROGRAM-ID. ACCTPRC.
       AUTHOR. LEGACY-SYSTEM.
       DATE-WRITTEN. 1987-03-15.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT ACCOUNT-FILE ASSIGN TO "ACCOUNTS.DAT"
           ORGANIZATION IS INDEXED
           ACCESS MODE IS DYNAMIC
           RECORD KEY IS ACCT-NUMBER.
       DATA DIVISION.
       FILE SECTION.
       FD  ACCOUNT-FILE.
       01  ACCOUNT-RECORD.
           05  ACCT-NUMBER         PIC 9(10).
           05  ACCT-NAME           PIC X(40).
           05  ACCT-BALANCE        PIC S9(9)V99.
           05  ACCT-STATUS         PIC X.
       WORKING-STORAGE SECTION.
       01  WS-TOTAL-BALANCE        PIC S9(11)V99 VALUE ZEROS.
       01  WS-ACCOUNT-COUNT        PIC 9(6) VALUE ZEROS.
       01  WS-ERROR-MSG            PIC X(80).
       01  WS-FLAGS.
           05  WS-EOF-FLAG         PIC X VALUE 'N'.
           05  WS-ERROR-FLAG       PIC X VALUE 'N'.
       PROCEDURE DIVISION.
       MAIN-LOGIC.
           PERFORM INITIALIZE-PROCESS
           PERFORM PROCESS-ACCOUNTS UNTIL WS-EOF-FLAG = 'Y'
           PERFORM FINALIZE-PROCESS
           STOP RUN.
       INITIALIZE-PROCESS.
           OPEN INPUT ACCOUNT-FILE
           IF FILE-STATUS NOT = '00'
               MOVE 'File open failed' TO WS-ERROR-MSG
               PERFORM HANDLE-ERROR
           END-IF
           READ ACCOUNT-FILE NEXT
               AT END MOVE 'Y' TO WS-EOF-FLAG
           END-READ.
       PROCESS-ACCOUNTS.
           IF ACCT-STATUS = 'A'
               ADD ACCT-BALANCE TO WS-TOTAL-BALANCE
               ADD 1 TO WS-ACCOUNT-COUNT
           END-IF
           READ ACCOUNT-FILE NEXT
               AT END MOVE 'Y' TO WS-EOF-FLAG
           END-READ.
       FINALIZE-PROCESS.
           CLOSE ACCOUNT-FILE
           DISPLAY 'Total Balance: ' WS-TOTAL-BALANCE
           DISPLAY 'Account Count: ' WS-ACCOUNT-COUNT.
       HANDLE-ERROR.
           DISPLAY 'ERROR: ' WS-ERROR-MSG
           MOVE 'Y' TO WS-ERROR-FLAG
           STOP RUN.`;

export const MIGRATED_TYPESCRIPT = `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './entities/account.entity';
import { Logger } from '@nestjs/common';

@Injectable()
export class AccountProcessor {
  private readonly logger = new Logger(AccountProcessor.name);

  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>
  ) {}

  async processAccounts(): Promise<void> {
    let totalBalance = 0;
    let accountCount = 0;

    try {
      const accounts = await this.accountRepository.find({
        where: { status: 'A' },
      });

      for (const account of accounts) {
        totalBalance += account.balance;
        accountCount++;
      }

      this.logger.log(\`Total Balance: \${totalBalance}\`);
      this.logger.log(\`Account Count: \${accountCount}\`);
    } catch (error) {
      this.logger.error(\`File open failed: \${error.message}\`);
      throw error;
    }
  }
}`;

export const DIAGNOSTICS = [
    { line: 9, col: 13, type: 'warning', message: 'Deprecated: ASSIGN TO string literal. Use environment variable instead.' },
    { line: 19, col: 9, type: 'error', message: 'PIC S9(9)V99 exceeds recommended precision for monetary values.' },
    { line: 42, col: 13, type: 'warning', message: 'FILE-STATUS check missing after READ operation.' },
    { line: 45, col: 13, type: 'info', message: 'Candidate for refactoring: PERFORM loop can be replaced with structured iteration.' },
];
