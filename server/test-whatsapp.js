const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "PASTE_YOUR_ACCESS_TOKEN_HERE";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "PASTE_YOUR_PHONE_NUMBER_ID_HERE";


const RECIPIENT_NUMBER = "918420366408"; 
const TEMPLATE_NAME = "order_brief_submitted_v2";

async function testWhatsApp() {
  console.log(`Sending WhatsApp template '${TEMPLATE_NAME}' to ${RECIPIENT_NUMBER}...`);
  
  const response = await fetch(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: RECIPIENT_NUMBER,
      type: "template",
      template: {
        name: TEMPLATE_NAME,
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: "Test Brand" },
              { type: "text", text: "Test Package" }
            ]
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [
              { type: "text", text: "test-order-id-123" }
            ]
          }
        ]
      }
    })
  });

  const data = await response.json();
  console.log("Meta API Response:", JSON.stringify(data, null, 2));
}

testWhatsApp().catch(console.error);
