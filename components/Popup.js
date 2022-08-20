import React, { useState } from 'react';
import { Modal } from "react-responsive-modal";
import { ToastContainer, toast } from 'react-toastify';
import axios from "axios";
import styles from "../styles/Home.module.css";
import 'react-toastify/dist/ReactToastify.css';
import "react-responsive-modal/styles.css";

function Popup() {
    const [open, setOpen] = useState(true);
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const onCloseModal = () => setOpen(false);
    const toastProperties = {
        position: "bottom-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
    }
    async function onSubscribe() {
        try {
            var emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
            var pattern = new RegExp(emailRegex);
            if (!email || !email.length) {
                toast.error('Email is required!', toastProperties);
            }
            else if (!pattern.test(email.trim())) {
                toast.error('Invalid Email!', toastProperties);
            }
            else {
                setLoading(true)
                const response = await axios.post("/api/newsletter", { email });
                setLoading(false);
                toast.success("Thank you for your subscribing!", toastProperties);
            }
        } catch (e) {
            setLoading(false)
            if (e.response.data.error.response.req.data.status === "subscribed") {
                toast.warn('This email is already subscribed.', toastProperties);
            }
            else {
                toast.error(e.response.data.errorMsg, toastProperties);
            }
        }
    }
    return (
        <Modal open={open} onClose={onCloseModal} top>
            <h1 style={{ fontSize: 18, fontWeight: "700" }}>SUBSCRIBE TO NEWSLETTER</h1>
            <div className={styles.modalInputContainer}>
                <input className={styles.modalInput}
                    type="text"
                    placeholder="Type your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)} />
                <button className={styles.modalButton} onClick={onSubscribe}>
                    Subscribe
                    {loading &&
                        <>
                            &nbsp;
                            <div className={styles.loader} />
                        </>}
                </button>
            </div>
            <ToastContainer />
        </Modal>

    );
}
export default Popup;

