import mailchimp from "@mailchimp/mailchimp_marketing";


const API_KEY = process.env.MAILCHIMP_API_KEY;
const API_SERVER = process.env.MAILCHIMP_API_SERVER;
const LIST_ID = process.env.MAILCHIMP_AUDIENCE_ID;


mailchimp.setConfig({
    apiKey: API_KEY,
    server: API_SERVER,
});

export default async (req, res) => {
    const { email } = req.body;
    try {
        const response = await mailchimp.lists.addListMember(LIST_ID, {
            email_address: email,
            status: "subscribed",
        });
        return res.status(201).json({ error: null, response });
    } catch (error) {
        return res.status(400).json({
            error,
            errorMsg: "Oops, something went wrong... "
        });
    }
};

