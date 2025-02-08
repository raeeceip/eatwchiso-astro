import styles from './TerminalPreview.module.css';

export const TerminalPreview = () => {
  return (
    <div className={styles.terminal}>
      <div className={styles.terminalHeader}>
        <span>Eat with Chiso Terminal Booking System v1.0.0</span>
      </div>
      
      <div className={styles.terminalBody}>
        <div className={styles.terminalPrompt}>
          <span className={styles.promptUser}>guest</span>
          <span className={styles.promptAt}>@</span>
          <span className={styles.promptHost}>eatwchiso</span>
          <span className={styles.promptColon}>:~$</span>
          <span className={styles.promptCommand}> ./book-breakfast.sh</span>
        </div>

        <div className={styles.responses}>
          <pre className={`${styles.response} ${styles.system}`}>
            12:00:00 [SYSTEM] Welcome to the Eat with Chiso Terminal Booking System v1.0.0
          </pre>
          <pre className={`${styles.response} ${styles.prompt}`}>
            Please enter your name:
          </pre>
          <pre className={`${styles.response} ${styles.input}`}>
            John Doe
          </pre>
          <pre className={`${styles.response} ${styles.prompt}`}>
            Please enter your email:
          </pre>
          <pre className={`${styles.response} ${styles.input}`}>
            john@example.com
          </pre>
          <pre className={`${styles.response} ${styles.prompt}`}>
            Enter the date (YYYY-MM-DD):
          </pre>
        </div>

        <div className={styles.inputLine}>
          <span className={styles.promptSymbol}>$</span>
          <span className={styles.cursor}>_</span>
        </div>
      </div>
    </div>
  );
};
