import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { sendEmailVerification, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import styles from "../styles/emailVerify.module.css";

export default function EmailVerify() {
  const router = useRouter();
  const [verifySent, setVerifySent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        if (user.emailVerified) router.push("/admindashboard");
      }
    });
  }, []);

  async function handleVerify() {
    setLoading(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setLoading(false);
      setVerifySent(true);
    } catch (error) {
      console.log(error.message);
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.heading}>
        <h2> Please verify your email </h2>
      </div>
      {verifySent ? (
        <div className={styles.verify}>
          <h3>
            Please check your email for a verification link.If you don 't see
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
