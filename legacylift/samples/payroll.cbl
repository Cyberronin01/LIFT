       IDENTIFICATION DIVISION.
       PROGRAM-ID. PAYROLL.
       AUTHOR. LEGACYLIFT-SAMPLE.

       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.

       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 WS-EMPLOYEE-RECORD.
          05 WS-EMP-ID          PIC 9(5).
          05 WS-EMP-NAME        PIC X(30).
          05 WS-SALARY          PIC 9(6)V99.
          05 WS-TAX-RATE        PIC 9(2)V99.
          05 WS-TAX-AMOUNT      PIC 9(6)V99.
          05 WS-NET-PAY         PIC 9(6)V99.
          05 WS-BONUS           PIC 9(5)V99.
          05 WS-OVERDRAWN-FLAG  PIC X(1).

       01 WS-COUNTERS.
          05 WS-TOTAL-EMPLOYEES PIC 9(4) VALUE 0.
          05 WS-TOTAL-PAYROLL   PIC 9(8)V99 VALUE 0.

       PROCEDURE DIVISION.
       MAIN-LOGIC.
           PERFORM INITIALIZE-SYSTEM.
           PERFORM PROCESS-EMPLOYEES.
           PERFORM GENERATE-SUMMARY.
           STOP RUN.

       INITIALIZE-SYSTEM.
           MOVE 0 TO WS-TOTAL-EMPLOYEES.
           MOVE 0 TO WS-TOTAL-PAYROLL.
           DISPLAY "PAYROLL SYSTEM INITIALIZED".

       PROCESS-EMPLOYEES.
           PERFORM CALCULATE-TAX.
           PERFORM CALCULATE-BONUS.
           PERFORM CALCULATE-NET-PAY.
           ADD 1 TO WS-TOTAL-EMPLOYEES.
           ADD WS-NET-PAY TO WS-TOTAL-PAYROLL.

       CALCULATE-TAX.
           EVALUATE TRUE
               WHEN WS-SALARY > 100000
                   MOVE 30.00 TO WS-TAX-RATE
               WHEN WS-SALARY > 50000
                   MOVE 20.00 TO WS-TAX-RATE
               WHEN WS-SALARY > 25000
                   MOVE 10.00 TO WS-TAX-RATE
               WHEN OTHER
                   MOVE 5.00 TO WS-TAX-RATE
           END-EVALUATE.
           COMPUTE WS-TAX-AMOUNT =
               WS-SALARY * WS-TAX-RATE / 100.

       CALCULATE-BONUS.
           IF WS-SALARY > 75000
               COMPUTE WS-BONUS = WS-SALARY * 0.10
           ELSE
               IF WS-SALARY > 40000
                   COMPUTE WS-BONUS = WS-SALARY * 0.05
               ELSE
                   MOVE 0 TO WS-BONUS
               END-IF
           END-IF.

       CALCULATE-NET-PAY.
           COMPUTE WS-NET-PAY =
               WS-SALARY - WS-TAX-AMOUNT + WS-BONUS.
           IF WS-NET-PAY < 0
               MOVE "Y" TO WS-OVERDRAWN-FLAG
               DISPLAY "WARNING: NEGATIVE NET PAY"
           ELSE
               MOVE "N" TO WS-OVERDRAWN-FLAG
           END-IF.

       GENERATE-SUMMARY.
           DISPLAY "TOTAL EMPLOYEES: " WS-TOTAL-EMPLOYEES.
           DISPLAY "TOTAL PAYROLL: " WS-TOTAL-PAYROLL.
           CALL "REPORTGEN" USING WS-EMPLOYEE-RECORD.
