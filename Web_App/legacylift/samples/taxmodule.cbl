       IDENTIFICATION DIVISION.
       PROGRAM-ID. TAXMODULE.
       AUTHOR. LEGACYLIFT-SAMPLE.

       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 WS-TAX-DATA.
          05 WS-GROSS-INCOME    PIC 9(8)V99.
          05 WS-DEDUCTIONS      PIC 9(6)V99.
          05 WS-TAXABLE-INCOME  PIC 9(8)V99.
          05 WS-TAX-DUE         PIC 9(8)V99.
          05 WS-TAX-BRACKET     PIC X(10).
          05 WS-FILING-STATUS   PIC X(1).

       01 WS-THRESHOLDS.
          05 WS-BRACKET-HIGH    PIC 9(8) VALUE 150000.
          05 WS-BRACKET-MID     PIC 9(8) VALUE 75000.
          05 WS-BRACKET-LOW     PIC 9(8) VALUE 30000.

       PROCEDURE DIVISION.
       TAX-MAIN.
           PERFORM COMPUTE-TAXABLE-INCOME.
           PERFORM DETERMINE-BRACKET.
           PERFORM CALCULATE-TAX-DUE.
           STOP RUN.

       COMPUTE-TAXABLE-INCOME.
           COMPUTE WS-TAXABLE-INCOME =
               WS-GROSS-INCOME - WS-DEDUCTIONS.
           IF WS-TAXABLE-INCOME < 0
               MOVE 0 TO WS-TAXABLE-INCOME
           END-IF.

       DETERMINE-BRACKET.
           EVALUATE TRUE
               WHEN WS-TAXABLE-INCOME > WS-BRACKET-HIGH
                   MOVE "HIGH" TO WS-TAX-BRACKET
               WHEN WS-TAXABLE-INCOME > WS-BRACKET-MID
                   MOVE "MEDIUM" TO WS-TAX-BRACKET
               WHEN WS-TAXABLE-INCOME > WS-BRACKET-LOW
                   MOVE "LOW" TO WS-TAX-BRACKET
               WHEN OTHER
                   MOVE "EXEMPT" TO WS-TAX-BRACKET
           END-EVALUATE.

       CALCULATE-TAX-DUE.
           EVALUATE WS-TAX-BRACKET
               WHEN "HIGH"
                   COMPUTE WS-TAX-DUE =
                       WS-TAXABLE-INCOME * 0.30
               WHEN "MEDIUM"
                   COMPUTE WS-TAX-DUE =
                       WS-TAXABLE-INCOME * 0.20
               WHEN "LOW"
                   COMPUTE WS-TAX-DUE =
                       WS-TAXABLE-INCOME * 0.10
               WHEN "EXEMPT"
                   MOVE 0 TO WS-TAX-DUE
           END-EVALUATE.
           IF WS-FILING-STATUS = "M"
               COMPUTE WS-TAX-DUE =
                   WS-TAX-DUE * 0.85
           END-IF.
           CALL "DBACCESS" USING WS-TAX-DATA.
           CALL "AUDITLOG" USING WS-TAX-DATA.
