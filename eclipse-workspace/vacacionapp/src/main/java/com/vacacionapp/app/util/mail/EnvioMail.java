package com.vacacionapp.app.util.mail;

import java.io.ByteArrayOutputStream;
import java.util.Properties;

import javax.activation.DataHandler;
import javax.activation.DataSource;
import javax.mail.Message;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMessage;
import javax.mail.internet.MimeMultipart;
import javax.mail.util.ByteArrayDataSource;

public class EnvioMail {

	public void SendMailPdf(ByteArrayOutputStream outputStream, String de, String para, String asunto, String mensaje) {
	
		String smtpHost = "ocorreosmtp";//"smtp.gmail.com"; //replace this with a valid host
	    int smtpPort = 25;//587; //replace this with a valid port
	    String sender = de; //replace this with a valid sender email address
	    String recipient = para; //replace this with a valid recipient email address
	    String subject = asunto;//"Solicitud de Vacaciones Prueba"; //this will be the subject of the email
	    String content = mensaje;//"Esta en la solicitud prueba de envio"; //this will be the text of the email


	    Properties properties = new Properties();
		    //properties.put("mail.smtp.auth", "true");
		    //properties.put("mail.smtp.starttls.enable", "true");
		    properties.put("mail.smtp.host", smtpHost);
		    properties.put("mail.smtp.port", smtpPort);
		    //properties.put("mail.smtp.user", sender);
		    //properties.put("mail.smtp.clave", pss);    
	    
		    Session session = Session.getDefaultInstance(properties,null);
	    /*Session session = Session.getDefaultInstance(properties, new javax.mail.Authenticator() {
	        protected PasswordAuthentication getPasswordAuthentication() {
	            return new PasswordAuthentication(sender, pss);
	      }
	  });*/

	    try {           
	        //construct the text body part
	        MimeBodyPart textBodyPart = new MimeBodyPart();
	        textBodyPart.setText(content);
	        
	        
	        byte[] bytes = outputStream.toByteArray();
			DataSource dataSource = new ByteArrayDataSource(bytes, "application/pdf");
			MimeBodyPart pdfBodyPart = new MimeBodyPart();
			pdfBodyPart.setDataHandler(new DataHandler(dataSource));
			pdfBodyPart.setFileName("Solicitud_Vacaciones.pdf");

	        //construct the mime multi part
	        MimeMultipart mimeMultipart = new MimeMultipart();
	        mimeMultipart.addBodyPart(textBodyPart);
	        mimeMultipart.addBodyPart(pdfBodyPart);

	        //create the sender/recipient addresses
	        InternetAddress iaSender = new InternetAddress(sender);
	        InternetAddress iaRecipient = new InternetAddress(recipient);

	        //construct the mime message
	        MimeMessage mimeMessage = new MimeMessage(session);
	        mimeMessage.setSender(iaSender);
	        mimeMessage.setSubject(subject);
	        mimeMessage.setRecipient(Message.RecipientType.TO, iaRecipient);
	        mimeMessage.setContent(mimeMultipart);

	        //send off the email
	        Transport.send(mimeMessage);

	        System.out.println("sent from " + sender + 
	                ", to " + recipient + 
	                "; server = " + smtpHost + ", port = " + smtpPort);         
	    } catch(Exception ex) {
	        ex.printStackTrace();
	    } finally {
	        //clean off
	        if(null != outputStream) {
	            try { 
		            	outputStream.close(); 
		            	outputStream = null; 
	            	}
	            catch(Exception ex) { 
	            	
	            	ex.printStackTrace();
	            }
	        }
	    }
	}
	public void SendMail(String de, String para, String asunto, String mensaje) {
		
		String smtpHost = "ocorreosmtp";//"smtp.gmail.com"; //replace this with a valid host
	    int smtpPort = 25;//587; //replace this with a valid port
	    String sender = de; //replace this with a valid sender email address
	    String recipient = para; //replace this with a valid recipient email address
	    String subject = asunto;//"Solicitud de Vacaciones Prueba"; //this will be the subject of the email
	    String content = mensaje;//"Esta en la solicitud prueba de envio"; //this will be the text of the email


	    Properties properties = new Properties();
		    //properties.put("mail.smtp.auth", "true");
		    //properties.put("mail.smtp.starttls.enable", "true");
		    properties.put("mail.smtp.host", smtpHost);
		    properties.put("mail.smtp.port", smtpPort);
		    //properties.put("mail.smtp.user", sender);
		    //properties.put("mail.smtp.clave", pss);    
	    
		    Session session = Session.getDefaultInstance(properties,null);
	    /*Session session = Session.getDefaultInstance(properties, new javax.mail.Authenticator() {
	        protected PasswordAuthentication getPasswordAuthentication() {
	            return new PasswordAuthentication(sender, pss);
	      }
	  });*/

	    try {           
        
	        Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(sender));
            message.setRecipients(Message.RecipientType.TO,InternetAddress.parse(recipient));
            message.setSubject(subject);
            message.setText(content);
 
            Transport.send(message);

	    } catch(Exception ex) {
	        ex.printStackTrace();
	    } finally {
	    	
	    }
	}	
	
}
