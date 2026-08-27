import { Link } from "react-router-dom";
import { LegalDocument, LegalSection } from "./LegalDocument";

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms and Conditions"
      description="The rules for using Homiva to browse homes, book short stays, request Homiva-managed services, shop household goods and publish partner or listing profiles."
    >
      <LegalSection title="1. Agreement">
        <p>
          These Terms govern your use of the Homiva website and services. By
          creating a profile or using Homiva, you agree to them and to the{" "}
          <Link to="/privacy" className="font-medium text-primary">
            Privacy Policy
          </Link>
          . If you do not agree, do not use the platform.
        </p>
        <p>
          Homiva is a Kenyan platform. These Terms are governed by the laws of
          Kenya. Homiva is a marketplace and operations layer: some listings and
          stays are offered by independent hosts or agents, while Homiva itself
          fulfils marketplace orders and Homiva-managed home services.
        </p>
      </LegalSection>

      <LegalSection title="2. Accounts">
        <p>
          You sign in with a one-time code sent to your email. There is no
          password. You must use an email you control and keep your inbox
          secure. Homiva ends idle sessions after 15 minutes of inactivity.
        </p>
        <p>
          You are responsible for activity on your account. Tell Homiva through{" "}
          <Link to="/messages" className="font-medium text-primary">
            Messages
          </Link>{" "}
          if you think someone else used it.
        </p>
      </LegalSection>

      <LegalSection title="3. Roles and verification">
        <p>
          Anyone can browse approved listings, products and partner companies.
          Extra capabilities require Homiva approval:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Real estate agent — create and manage sale, rent and stay listings.</li>
          <li>Landlord — manage rental listings and inquiries.</li>
          <li>Airbnb owner — list short stays and receive bookings.</li>
          <li>
            Partner companies — movers, cleaning companies, and interior design
            &amp; decor, published in the Partners directory.
          </li>
        </ul>
        <p>
          Applications may require identity, licence, KRA PIN, ownership or
          business documents, plus a service location. Homiva may approve,
          reject or suspend a role. Admin accounts are assigned by Homiva, not
          via application.
        </p>
      </LegalSection>

      <LegalSection title="4. Property listings">
        <p>
          Listings for sale, long-term rent and Airbnb stays are submitted by
          owners or agents and appear publicly only after Homiva approves them.
          Homiva may reject a listing or its location pin if details are
          incomplete, misleading or unsafe.
        </p>
        <p>
          Listing owners must provide accurate titles, prices in Kenyan
          Shillings, photos, location and availability. Homiva is not the
          seller, landlord or host of third-party listings and does not
          guarantee that a property will sell, let or match the description.
        </p>
        <p>
          To see the exact address and owner contact on eligible sale and rental
          listings, you pay a one-time <strong>KES 200 viewing fee</strong>{" "}
          through Paystack. The fee unlocks those details for your account. It
          is not a deposit on the property and does not reserve the home.
        </p>
      </LegalSection>

      <LegalSection title="5. Inquiries and contact">
        <p>
          &ldquo;Contact Homiva&rdquo; on a listing sends an inquiry to Homiva,
          not a direct booking. Homiva follows up with you and the listing
          party. Do not use inquiries to harass anyone or to request off-platform
          payments that avoid Homiva&apos;s checkout.
        </p>
      </LegalSection>

      <LegalSection title="6. Short-stay bookings">
        <p>
          Airbnb-style stays are booked from the listing calendar. Confirmed
          dates are blocked for other guests. You pay the stay total (nightly
          rate × nights) in KES through Paystack. Default check-in is 3:00 PM
          and check-out is 11:00 AM unless the listing says otherwise.
        </p>
        <p>
          A confirmed booking is an agreement between the guest and the host,
          facilitated by Homiva. Hosts must honour confirmed, paid stays.
          Guests must treat the property reasonably and leave at check-out.
          Homiva may cancel a booking that is fraudulent, unpaid or in serious
          dispute.
        </p>
        <p>
          Cancellation and refunds are handled case by case through Homiva
          (Messages or a dispute). Unless Homiva confirms otherwise in writing
          in-app, a paid stay is non-refundable once confirmed.
        </p>
      </LegalSection>

      <LegalSection title="7. Home services">
        <p>
          Cleaning (Mama Fua), plumbing and repairs &amp; maintenance are
          requested through Homiva and delivered by the Homiva operations team,
          not by independent marketplace contractors on those request forms.
          Estimates shown at request time are ranges based on category, size and
          urgency. The quoted amount Homiva later confirms is the amount payable
          unless you cancel before work is scheduled.
        </p>
        <p>
          You must provide a reachable phone number, a usable address and an
          accurate description of the job. Homiva may decline unsafe or
          incomplete requests.
        </p>
      </LegalSection>

      <LegalSection title="8. Marketplace">
        <p>
          The Home Marketplace currently sells Homiva-managed household goods
          (furniture, appliances, décor and similar). Prices are in KES. A
          delivery fee set by Homiva is added at checkout. You must provide a
          phone number and delivery address that Homiva can use to fulfil the
          order.
        </p>
        <p>
          Stock is limited. Homiva may cancel an order if an item cannot be
          supplied, and will refund the Paystack payment for that order if it
          was paid. Risk in goods passes to you on delivery. Raise a dispute
          from your{" "}
          <Link to="/orders" className="font-medium text-primary">
            orders
          </Link>{" "}
          if an item is not received, damaged or not as described.
        </p>
      </LegalSection>

      <LegalSection title="9. Partners">
        <p>
          Approved movers, cleaning companies and interior design teams appear
          in the Partners directory after Homiva review. Publication currently
          uses a monthly Homiva plan of <strong>KES 2,000</strong> for 30 days.
          Homiva does not guarantee leads. Partner content must be accurate and
          must not impersonate another business.
        </p>
      </LegalSection>

      <LegalSection title="10. Payments">
        <p>
          All Homiva charges are in Kenyan Shillings and are collected through
          Paystack. A payment is complete only after Homiva&apos;s payments
          function verifies the Paystack reference. Failed or cancelled
          checkouts do not unlock listings, confirm bookings, place orders or
          publish partner profiles.
        </p>
      </LegalSection>

      <LegalSection title="11. Content standards">
        <p>
          Do not post listings, photos, reviews, messages or partner profiles
          that are false, defamatory, illegal, discriminatory, or that infringe
          someone else&apos;s rights. Homiva may remove content and suspend
          accounts that break these rules.
        </p>
        <p>
          You grant Homiva a licence to host and display the content you upload
          (photos, descriptions, reviews) so the platform can function.
        </p>
      </LegalSection>

      <LegalSection title="12. Disputes">
        <p>
          You can raise a dispute about a marketplace order, home service,
          Airbnb booking, property listing or other Homiva matter. Homiva
          reviews the record and may mark the dispute investigating, resolved or
          rejected. Homiva&apos;s in-app decision is the first step; it does
          not stop you from using other remedies available under Kenyan law.
        </p>
      </LegalSection>

      <LegalSection title="13. Platform availability">
        <p>
          Homiva is provided as a live web app. Features, inventory and
          availability change as listings, stock and partner profiles are
          moderated. We do not warrant uninterrupted access. Map pins, estimates
          and directory information are provided to help you decide, not as a
          survey, valuation or credit offer.
        </p>
      </LegalSection>

      <LegalSection title="14. Liability">
        <p>
          To the fullest extent allowed by Kenyan law, Homiva is not liable for
          losses arising from independent hosts, agents or partner companies,
          from inaccurate user-submitted listing data, or from events outside
          our reasonable control. Homiva&apos;s total liability for a claim
          related to a paid Homiva service (viewing fee, booking facilitation,
          marketplace order or Homiva-managed job) is limited to the amount you
          paid Homiva for that specific transaction.
        </p>
        <p>
          Nothing in these Terms excludes liability that cannot be excluded by
          law, including fraud or death or personal injury caused by
          Homiva&apos;s negligence.
        </p>
      </LegalSection>

      <LegalSection title="15. Changes and contact">
        <p>
          Homiva may update these Terms as the product changes. The date at the
          top of this page will change when we do. Continued use after an update
          means you accept the new Terms.
        </p>
        <p>
          For help, use in-app Messages, your{" "}
          <Link to="/profile" className="font-medium text-primary">
            profile
          </Link>
          , or a dispute on the relevant order, stay or service request.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
