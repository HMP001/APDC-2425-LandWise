package pt.unl.fct.di.apdc.userapp.resources;

import java.io.IOException;
import java.io.OutputStream;

import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.StreamingOutput;
import jakarta.ws.rs.core.Response.Status;

@Path("/media")
public class MediaResource {

	@GET
	@Path("/download/{bucket}/{object}")
	public Response downloadFile(@PathParam("bucket") String bucket, @PathParam("object") String object) {

		Storage storage = StorageOptions.getDefaultInstance().getService();
		Blob blob = storage.get(BlobId.of(bucket, object));

		StreamingOutput stream = new StreamingOutput() {

			@Override
			public void write(OutputStream output) throws IOException {

				// Download object to the output stream. See Google's documentation.
				blob.downloadTo(output);
				output.flush();
			}
		};

		return Response.ok(stream)
				.header("Content-Type", blob.getContentType())
				.build();
	}

	@POST
	@Path("/upload/{bucket}/{object}")
	public Response uploadFile(@PathParam("bucket") String bucket, @PathParam("object") String object,
			@HeaderParam("Content-Type") String contentType,
			@Context HttpServletRequest request) {

		// Upload to Google Cloud Storage (see Google's documentation)
		Storage storage = StorageOptions.getDefaultInstance().getService();
		BlobId blobId = BlobId.of(bucket, object);
		BlobInfo blobInfo = BlobInfo.newBuilder(blobId).setContentType(contentType).build();
		// The following is deprecated since it is better to upload directly to GCS from
		// the client
		try (var inputStream = request.getInputStream();
			 var writer = storage.writer(blobInfo)) {
			byte[] buffer = new byte[8192];
			int bytesRead;
			while ((bytesRead = inputStream.read(buffer)) != -1) {
				writer.write(java.nio.ByteBuffer.wrap(buffer, 0, bytesRead));
			}
			return Response.ok().build();
		} catch (IOException e) {
			return Response.status(Status.INTERNAL_SERVER_ERROR).build();
		}
	}
}
