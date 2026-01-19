import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const doc = new jsPDF();
    let y = 20;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;

    // Helper function to add text with auto page breaks
    const addText = (text, fontSize, isBold = false, indent = 0) => {
      doc.setFontSize(fontSize);
      doc.setFont(undefined, isBold ? 'bold' : 'normal');
      
      const lines = doc.splitTextToSize(text, maxWidth - indent);
      lines.forEach(line => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin + indent, y);
        y += fontSize * 0.5;
      });
      y += 3;
    };

    // Cover Page
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.text('Circle', pageWidth / 2, 80, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setFont(undefined, 'normal');
    doc.text('Legal Documents', pageWidth / 2, 100, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('Privacy Policy • Safety Policy • Terms of Use', pageWidth / 2, 120, { align: 'center' });
    doc.text('Last Updated: January 2026', pageWidth / 2, 250, { align: 'center' });

    // PRIVACY POLICY
    doc.addPage();
    y = 20;
    
    addText('PRIVACY POLICY', 20, true);
    y += 5;

    addText('Information We Collect', 14, true);
    addText('We collect information you provide during registration including your name, email, phone number, profile photos, and preferences. Location data is collected only when you use location-based features.', 10);

    addText('How We Use Your Information', 14, true);
    addText('• To facilitate connections between seekers and companions', 10, false, 5);
    addText('• To process payments and maintain transaction records', 10, false, 5);
    addText('• To verify identity and ensure platform safety', 10, false, 5);
    addText('• To send important notifications about your bookings', 10, false, 5);
    addText('• To improve our services and user experience', 10, false, 5);

    addText('Data Protection', 14, true);
    addText('Your personal information is encrypted and stored securely. We implement industry-standard security measures to protect against unauthorized access, alteration, or disclosure.', 10);

    addText('Information Sharing', 14, true);
    addText('We only share your information with matched users for the purpose of facilitating meetups. We never sell your personal data to third parties. Payment information is securely processed through encrypted payment gateways.', 10);

    addText('Your Rights', 14, true);
    addText('• Access and review your personal data anytime', 10, false, 5);
    addText('• Request correction of inaccurate information', 10, false, 5);
    addText('• Delete your account and associated data', 10, false, 5);
    addText('• Opt-out of non-essential communications', 10, false, 5);

    addText('Cookies & Tracking', 14, true);
    addText('We use cookies to enhance your experience and analyze platform usage. You can manage cookie preferences through your browser settings.', 10);

    addText('Data Retention', 14, true);
    addText('We retain your account information as long as your account is active. After account deletion, personal data is removed within 30 days, except for:', 10);
    addText('• Transaction records (required for legal compliance)', 10, false, 5);
    addText('• Safety incident reports', 10, false, 5);
    addText('• Communications related to disputes', 10, false, 5);
    addText('Data retention for legal purposes is limited to what\'s required by applicable laws.', 10);

    // SAFETY POLICY
    doc.addPage();
    y = 20;

    addText('SAFETY POLICY', 20, true);
    y += 5;

    addText('Your Safety Matters', 14, true);
    addText('We prioritize your security and privacy at every step.', 10);

    addText('Safety Guidelines', 14, true);

    addText('1. Meet in Public Places', 12, true);
    addText('Always choose verified venues with CCTV coverage for your first meetup. We recommend restaurants, cafes, or other public spaces.', 10);

    addText('2. Verify Identity', 12, true);
    addText('All companions go through KYC verification. Check profile badges and reviews before booking.', 10);

    addText('3. Share Your Plans', 12, true);
    addText('Let a trusted friend or family member know about your meetup details including time, location, and companion information.', 10);

    addText('4. Trust Your Instincts', 12, true);
    addText('If something feels off, it\'s okay to cancel or leave. Your safety is the priority.', 10);

    addText('5. Use In-App Communication', 12, true);
    addText('Keep all communication within the app chat until you feel comfortable. Never share personal contact details prematurely.', 10);

    addText('6. Payment Protection', 12, true);
    addText('All payments are held in escrow until the meetup is completed. Never arrange payment outside the platform.', 10);

    addText('Report Concerns', 14, true);
    addText('If you experience any inappropriate behavior, harassment, or safety concerns, please report immediately. Our team investigates all reports within 24 hours.', 10);
    addText('Emergency Helpline: +91 9876543210', 10);
    addText('Safety Team: safety@circle.com', 10);

    // TERMS OF USE
    doc.addPage();
    y = 20;

    addText('TERMS OF USE', 20, true);
    y += 5;

    addText('Community Guidelines', 14, true);

    addText('1. Age Verification', 12, true);
    addText('You confirm that you are 18 years of age or older.', 10);

    addText('2. No Illegal Services', 12, true);
    addText('This platform is strictly for companionship and conversation, not escorting or any illegal services.', 10);

    addText('3. Public Venues Only', 12, true);
    addText('All meetups must be conducted in verified public venues like restaurants and cafes.', 10);

    addText('4. Account Responsibility', 12, true);
    addText('You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.', 10);

    addText('5. Prohibited Conduct', 12, true);
    addText('• Harassment, abuse, or threatening behavior', 10, false, 5);
    addText('• Posting false or misleading information', 10, false, 5);
    addText('• Soliciting illegal services', 10, false, 5);
    addText('• Attempting to circumvent platform payments', 10, false, 5);
    addText('• Using the platform for commercial purposes without authorization', 10, false, 5);

    addText('6. Termination', 12, true);
    addText('We reserve the right to suspend or terminate your account for violation of these terms. Violation may result in immediate account suspension and legal action.', 10);

    addText('7. Limitation of Liability', 12, true);
    addText('Circle provides a platform for users to connect. We are not responsible for the conduct of users during meetups. Users are responsible for their own safety and interactions.', 10);

    addText('8. Dispute Resolution', 12, true);
    addText('Any disputes arising from the use of our platform will be resolved through our internal dispute resolution process. For unresolved matters, applicable laws of India shall govern.', 10);

    addText('9. Changes to Terms', 12, true);
    addText('We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the updated terms.', 10);

    addText('Contact Information', 14, true);
    addText('For questions about these policies or to exercise your rights, contact:', 10);
    addText('Email: support@circle.com', 10);
    addText('Privacy Team: privacy@circle.com', 10);

    // Generate PDF
    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Circle_Legal_Documents.pdf"'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});