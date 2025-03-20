import { NextRequest, NextResponse } from 'next/server';
import { getDocument } from '../../firebase/firestore';
import jspdf from 'jspdf';
import 'jspdf-autotable';
// Note: In a production environment, you'd use a PDF generation library
// like jsPDF, PDFKit, or a service like Puppeteer to generate PDFs

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const documentId = url.searchParams.get('id');
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }
    
    try {
      // Get document from Firestore
      const document = await getDocument(documentId);
      
      if (!document) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }
      
      // Generate PDF using jsPDF
      const pdf = new jspdf({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      // Add title
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(document.title, 20, 20);
      
      // Add document type and date
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Document Type: ${document.type}`, 20, 30);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 35);
      
      // Add main content
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      // Format and add the document content with line breaks
      const contentLines = document.fullContent.split('\n');
      let yPosition = 45;
      
      contentLines.forEach((line) => {
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
        }
        
        if (line.trim() === '') {
          yPosition += 4; // Add space for empty lines
        } else if (line.startsWith('#') || line.startsWith('ARTICLE')) {
          // Handle headers
          pdf.setFont('helvetica', 'bold');
          pdf.text(line, 20, yPosition);
          pdf.setFont('helvetica', 'normal');
          yPosition += 8;
        } else {
          // Handle normal text with wrapping
          const textLines = pdf.splitTextToSize(line, 170);
          textLines.forEach((textLine: string) => {
            if (yPosition > 270) {
              pdf.addPage();
              yPosition = 20;
            }
            pdf.text(textLine, 20, yPosition);
            yPosition += 5;
          });
        }
      });
      
      // Add signature section if document is signed
      if (document.signatures && document.signatures.length > 0) {
        pdf.addPage();
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Signatures', 20, 20);
        
        let sigY = 30;
        document.signatures.forEach((signature: any) => {
          pdf.setFontSize(11);
          pdf.text(`${signature.name || 'Signatory'}`, 20, sigY);
          pdf.setFontSize(10);
          pdf.text(`Signed on: ${new Date(signature.timestamp?.toDate()).toLocaleString()}`, 20, sigY + 5);
          
          // Add signature image if available
          if (signature.signatureData) {
            try {
              pdf.addImage(signature.signatureData, 'PNG', 20, sigY + 10, 50, 20);
            } catch (err) {
              console.error('Error adding signature image:', err);
              pdf.text('[Signature Available]', 20, sigY + 15);
            }
          }
          
          sigY += 40;
        });
      }
      
      // Generate PDF buffer
      const pdfBuffer = pdf.output('arraybuffer');
      
      // Return the PDF as a download
      const fileName = `${document.title.replace(/\s+/g, '_')}.pdf`;
      
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': pdfBuffer.byteLength.toString()
        },
      });
    } catch (dbError) {
      console.error('Error retrieving document from Firestore:', dbError);
      return NextResponse.json(
        { error: 'Failed to retrieve document from database' },
        { status: 500 }
      );
    }
    
    // Production Implementation would look something like:
    /*
    // Generate PDF using a library like jsPDF
    const pdfBuffer = await generatePDF(document);
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${document.title.replace(/\s+/g, '_')}.pdf"`,
      },
    });
    */
  } catch (error) {
    console.error('Error generating download:', error);
    return NextResponse.json(
      { error: 'Failed to generate document download' },
      { status: 500 }
    );
  }
} 