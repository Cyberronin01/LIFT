       IDENTIFICATION DIVISION.
       PROGRAM-ID. EMPMANAGER.
       AUTHOR. LEGACYLIFT-SAMPLE.

       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 WS-EMPLOYEE.
          05 WS-EMP-ID          PIC 9(5).
          05 WS-EMP-NAME        PIC X(30).
          05 WS-DEPARTMENT      PIC X(20).
          05 WS-HIRE-DATE       PIC 9(8).
          05 WS-ACTIVE-FLAG     PIC X(1).
          05 WS-SALARY          PIC 9(6)V99.
          05 WS-PERFORMANCE     PIC 9(2).

       01 WS-COUNTS.
          05 WS-ACTIVE-COUNT    PIC 9(4) VALUE 0.
          05 WS-INACTIVE-COUNT  PIC 9(4) VALUE 0.
          05 WS-HIGH-PERF-COUNT PIC 9(4) VALUE 0.

       01 WS-PASSWORD          PIC X(20).
       01 WS-HARDCODED-KEY     PIC X(16) VALUE "ABCD1234EFGH5678".

       PROCEDURE DIVISION.
       EMP-MAIN.
           PERFORM VALIDATE-EMPLOYEE.
           PERFORM CLASSIFY-PERFORMANCE.
           PERFORM UPDATE-COUNTS.
           CALL "PAYROLL" USING WS-EMPLOYEE.
           CALL "DBACCESS" USING WS-EMPLOYEE.
           STOP RUN.

       VALIDATE-EMPLOYEE.
           IF WS-EMP-ID = 0
               DISPLAY "ERROR: INVALID EMPLOYEE ID"
               STOP RUN
           END-IF.
           IF WS-EMP-NAME = SPACES
               DISPLAY "ERROR: NAME REQUIRED"
               STOP RUN
           END-IF.
           IF WS-ACTIVE-FLAG NOT = "Y"
               AND WS-ACTIVE-FLAG NOT = "N"
               MOVE "N" TO WS-ACTIVE-FLAG
           END-IF.

       CLASSIFY-PERFORMANCE.
           EVALUATE TRUE
               WHEN WS-PERFORMANCE > 90
                   DISPLAY "EXCELLENT PERFORMER"
                   ADD 1 TO WS-HIGH-PERF-COUNT
               WHEN WS-PERFORMANCE > 70
                   DISPLAY "GOOD PERFORMER"
               WHEN WS-PERFORMANCE > 50
                   DISPLAY "AVERAGE PERFORMER"
               WHEN OTHER
                   DISPLAY "NEEDS IMPROVEMENT"
           END-EVALUATE.

       UPDATE-COUNTS.
           IF WS-ACTIVE-FLAG = "Y"
               ADD 1 TO WS-ACTIVE-COUNT
           ELSE
               ADD 1 TO WS-INACTIVE-COUNT
           END-IF.
