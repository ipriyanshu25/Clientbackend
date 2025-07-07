// scripts/uploadFaqs.js
// This script will upload a list of FAQs to the backend API

const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const ENDPOINT = '/faqs/create';

// Define your list of FAQs here
const faqs = [
  {
    question: 'What is ShareMitra and how does it work?',
    answer: 'ShareMitra is a platform for boosting engagement on YouTube and Instagram through 100% real human likes, comments and replies. Once you place an order, we begin delivery within 1–24 hours and complete it within up to 30 business days.'
  },
  {
    question: 'Who can use ShareMitra?',
    answer: 'Anyone 18 or older with a valid YouTube or Instagram account and a ShareMitra account. You must comply with platform policies and provide accurate URLs or post links.'
  },
  {
    question: 'How do I pay and in what currency?',
    answer: 'All fees are billed in U.S. Dollars (USD). Payments are processed via Razorpay until we add additional gateways like Stripe.'
  },
  {
    question: 'Can I change or modify my order after placing it?',
    answer: 'You can request changes before delivery begins by emailing support@sharemitra.com or calling customer service. Once a campaign has started, modifications aren’t possible.'
  },
  {
    question: 'How long does delivery take?',
    answer: 'We start fulfillment within 1–24 hours of your order and finish within 30 business days, depending on volume and platform processing.'
  },
  {
    question: 'How do I track my campaign progress?',
    answer: 'Log in to your dashboard at any time to see real-time status updates on your order’s delivery.'
  },
  {
    question: 'How can I cancel my order and request a refund?',
    answer: 'Cancel before delivery starts by contacting support. If the campaign hasn’t initiated, you’ll receive a full refund to your original payment method within five–seven business days.'
  },
  {
    question: 'What if my order fails or is delayed?',
    answer: 'If we can’t deliver (for example, due to private or invalid links), we’ll notify you and hold your order until you provide the correct information. You can also raise a dispute within seven days of completion.'
  },
  {
    question: 'Do you guarantee specific results?',
    answer: 'No. We provide estimates only. Actual increases in views, followers or engagement depend on factors outside our control, including platform algorithms.'
  },
  {
    question: 'How do you ensure engagement comes from real human users?',
    answer: 'We work with a vetted global network of real account holders. We never use bots, so all interactions comply with platform policies.'
  },
  {
    question: 'Is my personal and payment data safe?',
    answer: 'Yes. We use industry-standard administrative, technical and physical safeguards to protect your information and never store full payment card data on our servers.'
  },
  {
    question: 'Are there any restrictions on using your service?',
    answer: 'You may not resell our services to competitors, violate third-party platform rules, spam, hack, scrape or misrepresent your identity.'
  },
  {
    question: 'Do you offer custom packages or bulk discounts?',
    answer: 'Yes. Email support@sharemitra.com with your requirements and we’ll tailor a custom package or volume discount.'
  },
  {
    question: 'Do you comply with GDPR and other privacy laws?',
    answer: 'For EEA users, we process personal data only with your consent and honor all GDPR rights (access, correction, deletion, portability). See our Privacy Policy for details.'
  },
  {
    question: 'How can I contact your support team?',
    answer: 'Email support@sharemitra.com or call the customer-service number listed on our Contact page. We aim to respond within 24 hours.'
  }
];

async function uploadAll() {
  console.log(`Uploading ${faqs.length} FAQs to ${BASE_URL}${ENDPOINT}...`);
  for (let i = 0; i < faqs.length; i++) {
    const faq = faqs[i];
    try {
      const res = await axios.post(`${BASE_URL}${ENDPOINT}`, faq, {
        headers: { 'Content-Type': 'application/json' }
      });
      console.log(`✅ [${i + 1}/${faqs.length}] Uploaded:`, res.data.faqId);
    } catch (err) {
      console.error(`❌ [${i + 1}/${faqs.length}] Failed to upload question: "${faq.question}"`, err.response?.data || err.message);
    }
  }
  console.log('Upload complete.');
}

uploadAll();
