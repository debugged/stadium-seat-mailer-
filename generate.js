var csv = require('csvtojson')
var path = require('path')
var fs = require('fs')
var qrcode = require('qrcode')
var puppeteer = require('puppeteer')

const getEntrance = (section, seat) => {
  switch (section) {
    case 'Balkon 1 tickets':
    case 'Balkon 1 AHOY':
    case 'Balkon 2 tickets':
    case 'Balkon 3 tickets':
    case 'Balkon 3 extra': {
      return 'Roltrap entree'
    }
    case 'Tribunetickets': {
      return seat <= 23 ? 'Links' : 'Rechts'
    }
    case 'Vloertickets VIP':
    case 'Vloertickets vak 1':
    case 'Vloertickets vak 2': {
      return seat <= 20 ? 'Links' : 'Rechts'
    }
    case 'Rolstoel tickets': {
      return 'Rechts'
    }
  }
}

const getPrice = (section) => {
  switch (section) {
    case 'Balkon 1 tickets': {
      return 50
    }
    case 'Balkon 1 AHOY': {
      return null
    }
    case 'Balkon 2 tickets': {
      return 45
    }
    case 'Balkon 3 tickets':
    case 'Balkon 3 extra': {
      return 40
    }
    case 'Tribunetickets': {
      return 60
    }
    case 'Vloertickets VIP': {
      return null
    }
    case 'Vloertickets vak 1':{
      return 80
    }
    case 'Vloertickets vak 2': {
      return 70
    }
    case 'Rolstoel tickets': {
      return 60
    }
  }
}

async function generate() {
  const data = await csv({delimiter: [',']}).fromFile(path.join(__dirname, `tickets.csv`));
  const groupedOrders = [];
  data.forEach((ticket) => {
    const groupedOrderIndex = groupedOrders.findIndex((o) => o.id === ticket.id);
    if (groupedOrderIndex !== -1) {
      groupedOrders[groupedOrderIndex].tickets.push({
        scanCode: ticket.scanCode,
        section: ticket.section,
        row: ticket.row,
        seat: ticket.seat
      });
    } else {
      groupedOrders.push({
        id: ticket.id,
        uuid: ticket.uuid,
        name: ticket.name,
        email: ticket.email,
        tickets: [
          {
            scanCode: ticket.scanCode,
            section: ticket.section,
            row: ticket.row,
            seat: ticket.seat
          },
        ],
      });
    }
  });

  if (!fs.existsSync(`input`)) {
    fs.mkdirSync(`input`);
  } else {
    fs.rmSync('input', { recursive: true, force: true })
    fs.mkdirSync(`input`);
  }

  if (!fs.existsSync(`output`)) {
    fs.mkdirSync(`output`);
  } else {
    fs.rmSync('output', { recursive: true, force: true })
    fs.mkdirSync(`output`);
  }

  const basisHTML = fs.readFileSync(path.join(__dirname, "assets/base.html"), "utf8");
  const ticketHTML = fs.readFileSync(path.join(__dirname, "assets/ticket.html"), "utf8");
  const browser = await puppeteer.launch();

  for(const order of groupedOrders) {
    const page = await browser.newPage();
    const baseTemplate = `${basisHTML}`
    const tickets = await Promise.all(
      order.tickets.map(async (ticket) => {
        let ticketTemplate = `${ticketHTML}`;
        ticketTemplate = ticketTemplate.replace(`[ROOM]`, `${ticket.section}`);
        ticketTemplate = ticketTemplate.replace(`[ROW]`, `${ticket.row}`);
        ticketTemplate = ticketTemplate.replace(`[SEAT]`, `${ticket.seat}`);
        ticketTemplate = ticketTemplate.replace(`[ENTRENCE]`, getEntrance(ticket.section, ticket.seat));

        ticketTemplate = ticketTemplate.replace(`[NAME]`, `${order.name}`);
        ticketTemplate = ticketTemplate.replace(`[UUID]`, `${order.uuid}`);
        ticketTemplate = ticketTemplate.replace(`[PRICE]`, `${getPrice(ticket.section) ? '€ ' + getPrice(ticket.section) : '-'}`);


        const qrCode = await qrcode.toDataURL(ticket.scanCode);
        ticketTemplate = ticketTemplate.replace(`[CODE]`, qrCode);
        return ticketTemplate
      })
    )
    await page.setContent(baseTemplate.replace("[BASE_CONTENT]", tickets.join("")));
    const data = await page.pdf({
      landscape: false,
      printBackground: true,
      format: "A4",
    });

    if (!fs.existsSync(`input/${order.email.toLowerCase()}`)) {
      fs.mkdirSync(`input/${order.email.toLowerCase()}`);
    } 

    await new Promise((resolve, reject) => {
      fs.writeFile(`input/${order.email.toLowerCase()}/${order.name}.pdf`, data, (err) => {
        if (err) return reject(err);
        resolve(null);
      });
    });
    console.log('Ticket generated for order:', order.id)
  }

  await browser.close();
}
generate().then(() => console.log("DONE!")).catch(error => console.log(error));
