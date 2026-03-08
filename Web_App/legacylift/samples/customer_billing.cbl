       IDENTIFICATION DIVISION.
       PROGRAM-ID. CUSTBILL.
       AUTHOR. LEGACYLIFT.
       
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT CUSTOMER-FILE ASSIGN TO "cust_data.dat"
               ORGANIZATION IS LINE SEQUENTIAL.
           SELECT BILLING-REPORT ASSIGN TO "billing_rpt.out"
               ORGANIZATION IS LINE SEQUENTIAL.

       DATA DIVISION.
       FILE SECTION.
       FD  CUSTOMER-FILE.
       01  CUSTOMER-RECORD.
           05  CUST-ID               PIC X(10).
           05  CUST-NAME             PIC X(30).
           05  CUST-TYPE             PIC X(1).
               88  PREMIUM-CUSTOMER  VALUE "P".
               88  STANDARD-CUSTOMER VALUE "S".
           05  DATA-USAGE-GB         PIC 9(4)V99.
           05  VOICE-MINUTES         PIC 9(4).

       FD  BILLING-REPORT.
       01  PRINT-LINE                PIC X(80).

       WORKING-STORAGE SECTION.
       01  WS-FLAGS.
           05  WS-EOF                PIC X(1) VALUE 'N'.
           05  WS-RECORD-COUNT       PIC 9(5) VALUE 0.
           05  WS-TOTAL-REVENUE      PIC 9(7)V99 VALUE 0.

       01  WS-RATES.
           05  RATE-DATA-PREM        PIC 9V99 VALUE 0.50.
           05  RATE-DATA-STD         PIC 9V99 VALUE 1.25.
           05  RATE-VOICE-PREM       PIC 9V99 VALUE 0.05.
           05  RATE-VOICE-STD        PIC 9V99 VALUE 0.15.
           05  BASE-FEE-PREM         PIC 9(3)V99 VALUE 049.99.
           05  BASE-FEE-STD          PIC 9(3)V99 VALUE 019.99.

       01  WS-CALC-FIELDS.
           05  WS-DATA-COST          PIC 9(5)V99 VALUE 0.
           05  WS-VOICE-COST         PIC 9(5)V99 VALUE 0.
           05  WS-TOTAL-BILL         PIC 9(6)V99 VALUE 0.
           05  WS-DISCOUNT           PIC 9(4)V99 VALUE 0.

       01  HEADER-LINE-1.
           05  FILLER                PIC X(20) VALUE "CUSTOMER BILLING RUN".
           05  FILLER                PIC X(60) VALUE SPACES.

       01  HEADER-LINE-2.
           05  FILLER                PIC X(10) VALUE "CUST ID   ".
           05  FILLER                PIC X(30) VALUE "NAME                          ".
           05  FILLER                PIC X(10) VALUE "DATA COST ".
           05  FILLER                PIC X(10) VALUE "VOICE COST".
           05  FILLER                PIC X(12) VALUE "TOTAL BILL  ".
           05  FILLER                PIC X(08) VALUE SPACES.

       01  DETAIL-LINE.
           05  DL-CUST-ID            PIC X(10).
           05  FILLER                PIC X(2)  VALUE SPACES.
           05  DL-CUST-NAME          PIC X(30).
           05  FILLER                PIC X(2)  VALUE SPACES.
           05  DL-DATA-COST          PIC $$$$,$$9.99.
           05  FILLER                PIC X(2)  VALUE SPACES.
           05  DL-VOICE-COST         PIC $$$$,$$9.99.
           05  FILLER                PIC X(2)  VALUE SPACES.
           05  DL-TOTAL-BILL         PIC $$$$$,$$9.99.

       01  SUMMARY-LINE.
           05  FILLER                PIC X(20) VALUE "TOTAL RECORDS:      ".
           05  SL-COUNT              PIC ZZZZ9.
           05  FILLER                PIC X(15) VALUE " TOTAL REVENUE:".
           05  SL-REVENUE            PIC $$$$$,$$9.99.
           05  FILLER                PIC X(20) VALUE SPACES.

       PROCEDURE DIVISION.
       100-MAIN-MODULE.
           PERFORM 200-INIT-ROUTINE
           PERFORM 300-PROCESS-DATA UNTIL WS-EOF = 'Y'
           PERFORM 400-WRAP-UP
           STOP RUN.

       200-INIT-ROUTINE.
           OPEN INPUT CUSTOMER-FILE
           OPEN OUTPUT BILLING-REPORT
           WRITE PRINT-LINE FROM HEADER-LINE-1
           WRITE PRINT-LINE FROM HEADER-LINE-2
           WRITE PRINT-LINE FROM SPACES
           READ CUSTOMER-FILE
               AT END MOVE 'Y' TO WS-EOF
           END-READ.

       300-PROCESS-DATA.
           ADD 1 TO WS-RECORD-COUNT
           
           INITIALIZE WS-CALC-FIELDS
           
           IF PREMIUM-CUSTOMER
               COMPUTE WS-DATA-COST = DATA-USAGE-GB * RATE-DATA-PREM
               COMPUTE WS-VOICE-COST = VOICE-MINUTES * RATE-VOICE-PREM
               COMPUTE WS-TOTAL-BILL = WS-DATA-COST + WS-VOICE-COST + BASE-FEE-PREM
               
               IF WS-TOTAL-BILL > 200.00
                   COMPUTE WS-DISCOUNT = WS-TOTAL-BILL * 0.10
                   SUBTRACT WS-DISCOUNT FROM WS-TOTAL-BILL
               END-IF
           ELSE 
               COMPUTE WS-DATA-COST = DATA-USAGE-GB * RATE-DATA-STD
               COMPUTE WS-VOICE-COST = VOICE-MINUTES * RATE-VOICE-STD
               COMPUTE WS-TOTAL-BILL = WS-DATA-COST + WS-VOICE-COST + BASE-FEE-STD
           END-IF

           ADD WS-TOTAL-BILL TO WS-TOTAL-REVENUE

           MOVE CUST-ID TO DL-CUST-ID
           MOVE CUST-NAME TO DL-CUST-NAME
           MOVE WS-DATA-COST TO DL-DATA-COST
           MOVE WS-VOICE-COST TO DL-VOICE-COST
           MOVE WS-TOTAL-BILL TO DL-TOTAL-BILL

           WRITE PRINT-LINE FROM DETAIL-LINE

           READ CUSTOMER-FILE
               AT END MOVE 'Y' TO WS-EOF
           END-READ.

       400-WRAP-UP.
           WRITE PRINT-LINE FROM SPACES
           MOVE WS-RECORD-COUNT TO SL-COUNT
           MOVE WS-TOTAL-REVENUE TO SL-REVENUE
           WRITE PRINT-LINE FROM SUMMARY-LINE
           
           CLOSE CUSTOMER-FILE
           CLOSE BILLING-REPORT.
