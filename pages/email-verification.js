import { useRouter } from "next/router";
import { useState } from "react";
import styles from "../styles/emailVerify.module.css";

export default function EmailVerify() {
  const router = useRouter();
  const [verifySent, setVerifySent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleVerify() {
    setLoading(true);
    // Simulate email verification (Firebase functionality removed)
    setTimeout(() => {
      setLoading(false);
      setVerifySent(true);
    }, 1000);
  }

  return (
    <div className={styles.container}>
      <div className={styles.heading}>
        <h2> Please verify your email </h2>
      </div>
      {verifySent ? (
        <div className={styles.verify}>
          <h3>
            Please check your email for a verification link. If you don't see
            the email, check your spam folder.
          </h3>
        </div>
      ) : (
        <div className={styles.button}>
          <button onClick={handleVerify}>
            {loading ? "Loading..." : "Send Verification Code"}
          </button>
        </div>
      )}
    </div>
  );
}
