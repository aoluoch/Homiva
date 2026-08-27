import { Link } from "react-router-dom";
import { LegalDocument, LegalSection } from "./LegalDocument";

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      description="How Homiva collects, uses and shares personal information when you browse listings, book stays, request home services, shop the marketplace or apply for a role."
    >
      <LegalSection title="1. Who we are">
        <p>
          Homiva is a Kenyan home companion platform. It helps people find homes
          to buy, rent or stay in, request Homiva-managed maintenance and Mama
          Fua cleaning, shop household goods, and discover approved partner
          companies (movers, cleaning companies, and interior design &amp;
          decor).
        </p>
        <p>
          Homiva is operated from Kenya and uses Appwrite Cloud (Frankfurt
          region) to host accounts, databases, files and functions, and Paystack
          to process Kenyan Shilling payments.
        </p>
      </LegalSection>

      <LegalSection title="2. Information we collect">
        <p>
          We collect only what the product needs to run the flows you use:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account.</strong> Full name and email when you create a
            profile with a one-time email code. We do not store a password.
            Sessions end after 15 minutes of inactivity.
          </li>
          <li>
            <strong>Profile.</strong> Optional phone number, bio and avatar
            photo.
          </li>
          <li>
            <strong>Role applications.</strong> If you apply to be a real estate
            agent, landlord, Airbnb owner, mover, cleaning company or interior
            designer, we collect your message, phone, county, town, address,
            map coordinates, and verification files such as a national ID or
            passport, KRA PIN certificate, licences, business permits, proof of
            ownership and portfolio documents.
          </li>
          <li>
            <strong>Property listings.</strong> Title, description, price,
            county, town, address, coordinates, bedrooms, bathrooms, size,
            amenities, photos, contact phone and email, and check-in / check-out
            times for short stays.
          </li>
          <li>
            <strong>Inquiries and messages.</strong> Messages you send about a
            listing, plus any phone number you include so Homiva can follow up.
          </li>
          <li>
            <strong>Bookings.</strong> Guest name and email, host, property,
            stay dates, guest count, amount paid and payment reference.
          </li>
          <li>
            <strong>Home services.</strong> Service category, problem,
            description, property type and size, urgency, photos, location,
            contact phone and scheduling notes.
          </li>
          <li>
            <strong>Marketplace orders.</strong> Product, quantity, amount,
            delivery fee, phone number and delivery address.
          </li>
          <li>
            <strong>Partner companies.</strong> Company name, description,
            category, logo, banner, portfolio images, contact details and
            subscription status.
          </li>
          <li>
            <strong>Payments.</strong> Amount, purpose (viewing fee, booking,
            order or subscription), Paystack reference and fulfilment status. We
            do not store full card numbers on Homiva.
          </li>
          <li>
            <strong>Saved and recently viewed listings,</strong> in-app
            notifications, reviews and disputes.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Information stored on your device">
        <p>
          Homiva keeps a small amount of data in your browser&apos;s local
          storage so the product can work between visits:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Your marketplace cart contents.</li>
          <li>
            A last-activity timestamp used only to end idle sessions after 15
            minutes.
          </li>
        </ul>
        <p>
          Appwrite also sets a session cookie so you stay signed in until you
          log out or the idle timer ends. Homiva does not use advertising
          cookies or third-party ad trackers.
        </p>
      </LegalSection>

      <LegalSection title="4. How we use information">
        <ul className="list-disc space-y-2 pl-5">
          <li>Create and secure your account with email OTP.</li>
          <li>
            Show approved listings, products and partner companies, and unlock
            exact address and contact details after a KES 200 viewing fee on
            sale and rental listings.
          </li>
          <li>
            Process bookings, marketplace checkout, partner subscriptions and
            service requests.
          </li>
          <li>
            Let Homiva admins review role applications, listings, products,
            partner profiles, inquiries, orders, bookings and service jobs, and
            keep an audit log of those actions.
          </li>
          <li>
            Notify you in-app about status changes, and let you message Homiva
            or other users involved in a listing, order or stay.
          </li>
          <li>Improve safety, prevent fraud and resolve disputes.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Who we share information with">
        <p>
          Homiva does not sell personal information. We share it only as needed
          to operate the platform:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Homiva operations and admins</strong> see inquiries,
            bookings, orders, service jobs, verification documents and audit
            records so they can moderate and fulfil work.
          </li>
          <li>
            <strong>Hosts and listing owners</strong> receive guest booking
            details needed to honour a stay.
          </li>
          <li>
            <strong>Appwrite</strong> hosts authentication, databases, file
            storage, teams and functions.
          </li>
          <li>
            <strong>Paystack</strong> processes payments in Kenyan Shillings.
            Their privacy policy applies to card and mobile-money handling.
          </li>
          <li>
            <strong>Maps.</strong> Location pins may be shown with OpenStreetMap
            / MapLibre so you or Homiva can get directions.
          </li>
        </ul>
        <p>
          Exact listing addresses and owner contact details stay hidden until a
          buyer or renter pays the viewing fee, or until Homiva unlocks them for
          an authorised account.
        </p>
      </LegalSection>

      <LegalSection title="6. Verification documents">
        <p>
          Identity, licence, KRA PIN and ownership files uploaded with a role
          application are used only to review that application. They are stored
          in a restricted Homiva storage bucket and are visible to Homiva
          admins. We do not publish those documents on public listing or partner
          pages.
        </p>
      </LegalSection>

      <LegalSection title="7. Payments">
        <p>
          Homiva charges in Kenyan Shillings through Paystack for:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>A one-time KES 200 viewing fee on eligible sale and rental listings.</li>
          <li>Short-stay (Airbnb) bookings.</li>
          <li>Marketplace orders, including the configured delivery fee.</li>
          <li>Partner company publication at KES 2,000 per month.</li>
        </ul>
        <p>
          Homiva records the payment reference and purpose so we can unlock a
          listing, confirm a stay, fulfil an order or publish a partner profile.
          Card and mobile-money credentials are handled by Paystack, not stored
          in Homiva&apos;s database.
        </p>
      </LegalSection>

      <LegalSection title="8. Retention">
        <p>
          We keep account, listing, booking, order, service, message and audit
          records for as long as needed to provide Homiva, meet legal
          obligations and resolve disputes. You can ask Homiva to close your
          account through in-app Messages. Some payment, tax and audit records
          may be retained after closure where Kenyan law requires it.
        </p>
      </LegalSection>

      <LegalSection title="9. Your rights">
        <p>
          If you are in Kenya, the Data Protection Act, 2019 gives you rights to
          access, correct, delete or object to certain processing of your
          personal data, and to withdraw consent where processing is based on
          consent. You can update profile details in{" "}
          <Link to="/profile" className="font-medium text-primary">
            Profile &amp; roles
          </Link>
          , remove items from your cart, and log out at any time. To request a
          copy or deletion of other records, message Homiva from your account.
        </p>
      </LegalSection>

      <LegalSection title="10. Children">
        <p>
          Homiva is built for adults arranging homes, stays, services and
          purchases in Kenya. It is not directed at children under 18. Do not
          create an account for a minor.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes">
        <p>
          If Homiva adds features that change how we handle personal
          information, we will update this page and the date above. Continued
          use after an update means you accept the revised policy.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
