require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors");

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const app = express();
const upload = multer({ dest: "uploads/" });

// app.use(
//   cors({
//     origin: "*",
//   })
// );

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const webAppUrl = process.env.WEB_APP_URL;
const providerToken = process.env.Provider_Token;

// Object to store order data
const orderData = {};

let firstName;
let lastName;
let username;

// Handle /start command
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const userLanguage = msg.from.language_code || "en";

  firstName = msg.from.first_name || "";
  lastName = msg.from.last_name || "";
  username = msg.from.username || "";

  if (text === "/start") {
    // await bot.sendMessage(chatId, "This is my Bot", {
    //   reply_markup: {
    //     keyboard: [
    //       [{ text: "Заказать", web_app: { url: webAppUrl + "order" } }],
    //     ],
    //   },
    // });

    await bot.sendMessage(
      "1947400936",
      `@${username}  <code>${chatId}</code>`,
      { parse_mode: "HTML" }
    );

    await bot.sendSticker(
      chatId,
      "https://tlgrm.eu/_/stickers/5ff/185/5ff185b6-6457-4128-b22e-c18477ad084e/1.webp",
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: `${
                  userLanguage === "ru" ? `Открыть Приложение` : `Open App`
                }`,
                web_app: { url: webAppUrl },
              },
            ],
          ],
        },
      }
    );
  }

  if (text === "/admin") {
    bot.sendMessage(
      chatId,
      `<b>Կապվեք ադմինիստրատորի հետ</b> \n\n<a href="https://t.me/ardinini">👤 <b>ADMIN</b></a>`,
      { parse_mode: "HTML" }
    );
  }

  if (text === "/rules") {
    await bot.sendMessage(
      chatId,
      `
📌 <b>Կանոններ</b>\n
<b>Չափերի ընտրություն:</b>
Մեր առաջարկած խաղալիքների չափերը հետևյալն են՝

▪️ <b>S</b> – 30 սմ   
▪️ <b>M</b> – 40 սմ
▪️ <b>L</b> – 50 սմ

Նշված սանտիմետրերը վերաբերում են խաղալիքի ամենաերկար մասի երկարությանը.

<b>Պատվերի պատրաստման ժամանակ:</b>
Ձեր պատվերը պատրաստվում է <b>10-15 րոպեի</b> ընթացքում։

<b>Առաքում:</b>
Առաքումը կարող է տևել <b>1-2 օր</b>, կախված ձեր նշած քաղաքի հեռավորությունից։

Եթե ունեք հավելյալ հարցեր, կարող եք կապ հաստատել մեզ հետ <a href="https://t.me/kidsartcraft_am">👤 <b>Telegram-ի</b></a> միջոցով։
        `,
      { parse_mode: "HTML" }
    );
  }
});

app.post("/send-photo", upload.single("photo"), (req, res) => {
  const {
    chatId,
    country,
    city,
    phoneNumber,
    size,
    productType,
    price,
    orderId,
  } = req.body;
  const photoPath = req.file.path;

  // Save order details in the storage with the unique order ID
  orderData[orderId] = {
    chatId,
    country,
    city,
    phoneNumber,
    size,
    productType,
    price,
    photoPath,
  };

  bot
    .sendPhoto(chatId, photoPath, {
      caption: `<b>Спасибо за заказ</b>\n\n<b>Город:</b> ${country}\n<b>Адрес:</b> ${city}\n<b>Номер Телефона:</b> ${phoneNumber}\n<b>Размер:</b> ${size}\n<b>Тип продукта:</b> ${
        productType + "---" + orderId
      }\n<b>Цена:</b> ${price} AMD`,
      parse_mode: "HTML",
    })
    .then(() => {
      return bot.sendMessage(
        chatId,
        `${"Пожалуйста, подтвердите и оплатите ваш заказ"}`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: `${"Подтвердить и Оплатить"}`,
                  callback_data: `pay_order_${orderId}`,
                },
              ],
            ],
          },
        }
      );
    })
    .then(() => {
      res.json({ success: true });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({ success: false });
    });
});

// ОПЛАТА START

let awaitingPayerName = {};

bot.on("callback_query", (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const callbackData = callbackQuery.data;
  const orderId = callbackData.split("_").pop();
  const order = orderData[orderId]; // Убедитесь, что orderData определен и доступен

  user = username;

  if (callbackData.startsWith("pay_order") && order) {
    const { language } = order;
    // Отправляем инструкции для оплаты
    bot.sendMessage(
      chatId,
      `🔶<b>Для оплаты используйте следующие реквизиты:</b>🔶 
      \n\n<b>🏦 Перевод на карту</b>
      \n<b>💳 Карта:  <code>4847040001580344</code></b>
      \n<b>👤 Получатель:  <code>Armen Barkhudaryan</code></b>
      \n---------------------------------------------------\n\n<b>🟠 Перевод на IDram</b>
      \n<b>💸 ID-счет:  <code>688603439</code></b>
      \n<b>🪪 Получатель: <code>Armen Barkhudaryan</code></b>\n\n\n<i>🔻После оплаты, пожалуйста, отправьте в этот чат сообщение, содержащее:</i>\n <b> - 🧾 чек оплаты </b>или<b> 👤 имя и фамилию плательщика</b>.`,
      {
        parse_mode: "HTML", // Enable HTML parsing
      }
    );

    // .then(() => {
    // Отправляем только GIF после отправки сообщения
    // bot
    //   .sendAnimation(
    //     chatId,
    //     "./gif_am_pay.gif" // Замените URL на ссылку на ваш GIF
    //   )
    //   .catch((error) => {
    //     console.error("Ошибка при отправке GIF:", error);
    //   });
    // })
    // .catch((error) => {
    //   console.error("Ошибка при отправке сообщения:", error);
    // });

    // Устанавливаем флаг ожидания ввода ФИО
    awaitingPayerName[chatId] = orderId;
  }
});
let payerName;
bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  // Проверяем, ждем ли мы ввода ФИО или чека от этого пользователя
  if (awaitingPayerName[chatId]) {
    const orderId = awaitingPayerName[chatId];
    const order = orderData[orderId];
    const { language } = order;

    if (msg.photo) {
      // Пользователь отправил чек
      const photoId = msg.photo[msg.photo.length - 1].file_id;

      // Сохраняем ID фото для дальнейшей проверки
      orderData[orderId].paymentProofPhotoId = photoId;

      // После получения чека отправляем кнопку подтверждения оплаты
      bot.sendMessage(
        chatId,
        `⬇️ Нажмите кнопку ниже, если вы выполнили оплату`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: `✅ Я оплатил`,
                  callback_data: `confirm_payment_${orderId}`,
                },
              ],
            ],
          },
        }
      );

      // Очищаем состояние ожидания после отправки кнопки
      delete awaitingPayerName[chatId];
    } else if (msg.text) {
      // Пользователь отправил имя и фамилию
      const payerName = msg.text.trim();
      orderData[orderId].payerName = payerName;

      // После получения имени и фамилии отправляем кнопку подтверждения оплаты
      bot.sendMessage(
        chatId,
        `⬇️ ${
          language === "am"
            ? `Սեղմեք ներքևի կոճակը, եթե դուք կատարել եք վճարումը`
            : `Нажмите кнопку ниже, если вы выполнили оплату`
        }`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: `✅${language === "am" ? `Ես վճարել եմ` : `Я оплатил`}`,
                  callback_data: `confirm_payment_${orderId}`,
                },
              ],
            ],
          },
        }
      );

      // Очищаем состояние ожидания после отправки кнопки
      delete awaitingPayerName[chatId];
    } else {
      // Пользователь отправил что-то некорректное
      bot.sendMessage(
        chatId,
        `Пожалуйста, отправьте скриншот оплаты или ваше имя и фамилию.`
      );
    }
  }
});

// Обработчик для callback_query, когда пользователь нажимает кнопку "Я оплатил"
bot.on("callback_query", (callbackQuery) => {
  const callbackData = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  // Извлекаем orderId из callbackData
  const orderId = callbackData.split("_").pop();
  const order = orderData[orderId]; // Получаем объект заказа
  const { language } = order;

  if (callbackData.startsWith("confirm_payment_")) {
    // Отправляем сообщение о подтверждении
    bot.sendMessage(
      chatId,
      `❗️ Ваш платеж будет подтвержден в течение 30 минут.\n\n<b>❗️ Если у вас возникли проблемы или вопросы, пожалуйста, свяжитесь с администратором через команду /admin.</b>\n\n<b>♻️ Ожидайте...</b>`,
      {
        parse_mode: "HTML",
      }
    );

    // Здесь можно добавить дальнейшую логику обработки подтверждения платежа, если необходимо
  }
});

// Отправка в внутренний чат
bot.on("callback_query", (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const callbackData = callbackQuery.data;
  const orderId = callbackData.split("_").pop();
  const order = orderData[orderId];

  if (callbackData.startsWith("confirm_payment_") && order) {
    const { price, productType, payerName } = order;

    // Запрос подтверждения у продавца
    const sellerChatId = "-1002431026585"; // ID чата продавца

    if (order.paymentProofPhotoId) {
      // Если чек существует, отправляем фото
      bot
        .sendPhoto(sellerChatId, order.paymentProofPhotoId, {
          caption: `Проверьте поступление платежа 
            \n(Чек предоставлен выше)
            \nна сумму - <b>${price} AMD.</b>\n\nПодтвердите или отклоните платеж. 
            \n@${username}\n<code>${productType + "-" + orderId}</code>`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "Подтвердить", callback_data: `approve_${orderId}` }],
              [{ text: "Отклонить", callback_data: `reject_${orderId}` }],
            ],
          },
        })
        .catch((error) => {
          console.error("Ошибка при отправке чека:", error);
        });
    } else if (payerName) {
      // Если отправлено имя и фамилия, отправляем сообщение без фото
      bot
        .sendMessage(
          sellerChatId,
          `Проверьте поступление платежа от - <b>${payerName}</b>\nна сумму - <b>${price} AMD.</b>\n\nПодтвердите или отклоните платеж. 
          \n@${username}\n<code>${productType + "-" + orderId}</code>`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "Подтвердить", callback_data: `approve_${orderId}` }],
                [{ text: "Отклонить", callback_data: `reject_${orderId}` }],
              ],
            },
          }
        )
        .catch((error) => {
          console.error("Ошибка при отправке сообщения:", error);
        });
    }
  }

  if (callbackData.startsWith("approve_") && order) {
    const { photoPath, productType, country, city, phoneNumber, size } = order;

    const chatIdPay = "-1002378059367";

    // Получаем текущую дату и прибавляем 7 дней
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 7);

    // Форматируем дату, чтобы месяц был числом
    const day = currentDate.getDate();
    const month = currentDate.getMonth() + 1; // Добавляем 1, так как месяцы начинаются с 0
    const year = currentDate.getFullYear();

    // Готовая дата в формате "день.месяц.год"
    const readyDate = `${day}.${month}.${year}`;

    // Отправка фото продавцу после нажатия кнопки "Подтвердить"
    bot
      .sendPhoto(chatIdPay, photoPath, {
        caption: `✅ <b>Потвержден</b> --- <code>${
          productType + "-" + orderId
        }</code>\n\n@${username}
        
Имя - <b>${firstName} ${lastName}</b>
Город - <b>${country}</b>
Адрес - <b>${city}</b>
Телефон - <b>${phoneNumber}</b>
Размер заказа - <b>${size}</b>
Время выдачи заказа - <b>${readyDate}</b>`,
        parse_mode: "HTML",
      })
      .then(() => {
        // Удаление файла после отправки
        fs.unlink(photoPath, (err) => {
          if (err) {
            console.error("Ошибка при удалении файла:", err);
          } else {
            console.log("Файл успешно удален");
          }
        });
      })
      .catch((error) => {
        console.error("Ошибка при отправке фото:", error);
      });
  }

  if (callbackData.startsWith("reject_") && order) {
    const { photoPath, productType, country, city, phoneNumber, size } = order;

    const chatIdReject = "-1002419314492";

    // Обработка отклонения платежа
    bot
      .sendPhoto(chatIdReject, photoPath, {
        caption: `❌ <b>Отклоненно</b>  --- <code>${
          productType + "-" + orderId
        }</code>\n\n@${username}
        
Имя - <b>${firstName} ${lastName}</b>
Город - <b>${country}</b>
Адрес - <b>${city}</b>
Телефон - <b>${phoneNumber}</b>
Размер заказа - <b>${size}</b>`,
        parse_mode: "HTML",
      })
      .then(() => {
        // Удаление файла после отправки
        fs.unlink(photoPath, (err) => {
          if (err) {
            console.error("Ошибка при удалении файла:", err);
          } else {
            console.log("Файл успешно удален");
          }
        });
      });
  }
});

bot.on("callback_query", (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const callbackData = callbackQuery.data;
  const orderId = callbackData.split("_").pop();
  const order = orderData[orderId];

  // Получаем текущую дату и прибавляем 7 дней
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + 7);

  // Форматируем дату, чтобы месяц был числом
  const day = currentDate.getDate();
  const month = currentDate.getMonth() + 1; // Добавляем 1, так как месяцы начинаются с 0
  const year = currentDate.getFullYear();

  // Готовая дата в формате "день.месяц.год"
  const readyDate = `${day}.${month}.${year}`;

  if (callbackData.startsWith("approve_") && order) {
    const { language, productType } = order;

    // Оплата подтверждена
    bot.sendMessage(
      order.chatId,
      `✅ <b>Ваша оплата успешно подтверждена. Спасибо!</b> \n\n📌 Номер Заказа: <b>${
        productType + "-" + orderId
      }</b>\n\n⏳ Заказ будет готов до: <b>${readyDate}</b>\n\n\n<b><i>📣 Следите за нашим Telegram-каналом и оставляйте свои предложения и отзывы, а также новости в нашем Instagram.</i></b>\n\n<a href="https://t.me/kidsartcraft_am">🔹 <b>TELEGRAM</b></a>\n\n<a href="https://www.instagram.com/kidsartcraft.am/">🔸 <b>INSTAGRAM</b></a>\n\n🗣 Получите 10% скидку по этому промокоду <b>--- <code>KIDS2024</code></b>`,
      { parse_mode: "HTML" }
    );
  } else if (callbackData.startsWith("reject_") && order) {
    const { language, productType } = order;
    // Оплата отклонена
    bot.sendMessage(
      order.chatId,
      `❌ <b>Ваша оплата отклонена. Пожалуйста, свяжитесь с поддержкой.</b>\n\n📌 Номер Заказа: <code>${productType}-${orderId}</code>\n\n👤 Свяжитесь с администратором - <a href="https://t.me/ardinini">https://t.me/ardinini</a>`,
      { parse_mode: "HTML" }
    );
  }
});

// bot.on("callback_query", (callbackQuery) => {
//   const chatId = callbackQuery.message.chat.id;
//   const callbackData = callbackQuery.data;
//   const orderId = callbackData.split("_").pop(); // Extract order ID from callback data
//   const order = orderData[orderId];

//   if (callbackData.startsWith("pay_order") && order) {
//     const { price, productType } = order;
//     const title = `${productType} --- ${orderId}`; // Title
//     const description = "Описание продукта"; // Description
//     const payload = `order_${orderId}`; // Payload, a unique string to identify the invoice
//     const currency = "RUB"; // Currency
//     const prices = [
//       {
//         label: "Product 1", // Label for the product
//         amount: parseInt(price, 10) * 100, // Amount in the smallest units of the currency
//       },
//     ];

//     const options = {
//       photo_url: "https://i.postimg.cc/gJ88Rhj3/pay.png",
//       photo_width: 512,
//       photo_height: 512,
//       need_name: true,
//       need_phone_number: true,
//       need_email: true,
//       need_shipping_address: true,
//       is_flexible: false,
//     };

//     bot
//       .sendInvoice(
//         chatId,
//         title,
//         description,
//         payload,
//         providerToken,
//         currency,
//         prices,
//         options
//       )
//       .catch((error) => {
//         console.error("Error sending invoice:", error);
//       });
//   }
// });

bot.on("polling_error", (error) => {
  console.error("Polling error:", error); // Detailed logging of polling errors
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
