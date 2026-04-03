const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate a PDF certificate
 * @param {Object} options - Certificate details
 * @param {string} options.certificateId - Unique certificate ID
 * @param {string} options.studentName - Student's full name
 * @param {string} options.courseName - Course title
 * @param {number} options.score - Final score percentage
 * @param {string} options.issueDate - ISO date string
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateCertificatePDF(options) {
  return new Promise((resolve, reject) => {
    const {
      certificateId = 'SV-CERT-000',
      studentName = 'Student Name',
      courseName = 'Course Name',
      score = 100,
      issueDate = new Date().toISOString().split('T')[0]
    } = options;

    // Create in-memory PDF
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 50,
      bufferPages: true
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Add background color (light beige)
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#faf8f3');

    // Border
    doc
      .lineWidth(3)
      .strokeColor('#1e293b')
      .rect(40, 40, doc.page.width - 80, doc.page.height - 80)
      .stroke();

    // Decorative top border
    doc
      .rect(50, 50, doc.page.width - 100, 3)
      .fillAndStroke('#6366f1', '#1e293b');

    // Title
    doc
      .fontSize(48)
      .font('Helvetica-Bold')
      .fillColor('#1e293b')
      .text('Certificate of Completion', { align: 'center', baseline: 'top' })
      .moveDown(0.5);

    // Subtitle
    doc
      .fontSize(14)
      .font('Helvetica')
      .fillColor('#64748b')
      .text('This certifies that', { align: 'center' })
      .moveDown(0.3);

    // Student name (prominently displayed)
    doc
      .fontSize(32)
      .font('Helvetica-Bold')
      .fillColor('#6366f1')
      .text(studentName, { align: 'center' })
      .moveDown(0.5);

    // Completion message
    doc
      .fontSize(14)
      .font('Helvetica')
      .fillColor('#1e293b')
      .text('has successfully completed the course', { align: 'center' });

    // Course name (prominently displayed)
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#1e293b')
      .text(courseName, { align: 'center', width: doc.page.width - 100 })
      .moveDown(0.5);

    // Score
    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#64748b')
      .text(`Score: ${score}%`, { align: 'center' })
      .moveDown(1.5);

    // Certificate details section
    const detailsY = doc.y;

    // Left column - Issue date
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#64748b')
      .text('Issue Date:', 100, detailsY);
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1e293b')
      .text(new Date(issueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }), 100, detailsY + 20);

    // Right column - Certificate ID
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#64748b')
      .text('Certificate ID:', doc.page.width - 300, detailsY);
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1e293b')
      .text(certificateId, doc.page.width - 300, detailsY + 20);

    // Signature line
    doc
      .lineWidth(1)
      .strokeColor('#1e293b')
      .moveTo(100, doc.page.height - 150)
      .lineTo(300, doc.page.height - 150)
      .stroke();

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#64748b')
      .text('Skillverse Certification', 100, doc.page.height - 140);

    // Footer
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#94a3b8')
      .text('This certificate is issued by Skillverse | skillverse.com', {
        align: 'center',
        baseline: 'bottom'
      });

    doc.end();
  });
}

module.exports = {
  generateCertificatePDF
};
