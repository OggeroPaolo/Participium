import { useState, useEffect, useActionState } from "react";
import { Form, Button, Container, Alert } from "react-bootstrap";
import { useNavigate } from "react-router";
import { getCategories, createReport } from "../API/API.js";

function ReportCreation() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);
  const [pics, setPics] = useState([]);

  useEffect(() => {
    const loadCategories = async () => {
      const categoryList = await getCategories();
      setCategories(categoryList);
    };

    loadCategories();
  }, []);

  // clean up preview URLs of images
  useEffect(() => {
    return () => {
      previewImages.forEach((img) => URL.revokeObjectURL(img.url));
    };
  }, [previewImages]);

  const [state, formAction] = useActionState(submitReport, {
    title: "",
    description: "",
    category: "",
    photos: [],
  });

  async function submitReport(prevData, formData) {
    setIsFormLoading(true);

    const attributes = {
      title: formData.get("title"),
      description: formData.get("description"),
      category: formData.get("category"),
      photos: formData.get("photos"),
    };

    try {
      await createReport(attributes);
      setTimeout(() => {
        navigate("/");
      }, 2500);
      return {
        success: "Report created successfully! Redirecting to homepage...",
      };
    } catch (error) {
      return { error: error.message };
    } finally {
      setIsFormLoading(false);
    }
  }

  // function for image preview
  function handleImageChange(e) {
    const incomingFiles = Array.from(e.target.files);

    // if more than 3 photos are added
    if (pics.length + incomingFiles.length > 3) {
      alert("You can only upload a maximum of 3 images.");

      e.target.value = null; // reset file input
      return;
    }

    const updatedPics = [...pics, ...incomingFiles];
    setPics(updatedPics);

    const previews = updatedPics.slice(0, 3).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPreviewImages(previews);
  }

  return (
    <>
      <Container
        fluid
        className='mt-3 ms-1 me-1 d-flex justify-content-center body-font'
      >
        <Container className='p-4' style={{ maxWidth: "800px" }}>
          <h3>
            <b>Create a new report</b>
          </h3>
          <Form action={formAction}>
            <Form.Group controlId='title' className='mb-3 mt-4'>
              <Form.Label>
                <b>Title</b>
              </Form.Label>
              <Form.Control type='text' name='title' required />
            </Form.Group>
            <Form.Group controlId='description' className='mb-3'>
              <Form.Label>
                <b>Description</b>
              </Form.Label>
              <Form.Control type='text' name='description' required />
            </Form.Group>
            <Form.Group controlId='category' className='mb-3'>
              <Form.Label>
                <b>Category</b>
              </Form.Label>
              <Form.Select name='category' required>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className='mb-3'>
              <Form.Label>
                <b>Upload a picture (max 3)</b>
              </Form.Label>
              <Form.Control
                type='file'
                name='photos'
                multiple
                onChange={handleImageChange}
                id='photo-input'
                accept='image/*'
                style={{ display: "none" }}
              />
              <Button
                onClick={() => document.getElementById("photo-input").click()}
                className='w-100 select-ph-btn'
              >
                SELECT PHOTOS
              </Button>
              <div className='d-flex gap-3 flex-wrap mt-3'>
                {previewImages.map((img, index) => (
                  <img
                    className='img-preview'
                    key={index}
                    src={img.url}
                    alt='preview'
                  />
                ))}
              </div>
            </Form.Group>

            {state.error && <Alert variant='danger'>{state.error}</Alert>}
            {state.success && (
              <Alert variant='success' className='mt-4'>
                {state.success}
              </Alert>
            )}
            {isFormLoading && (
              <>
                <div
                  className='d-flex justify-content-center align-items-center'
                  style={{ minHeight: "10vh" }}
                >
                  <div className='spinner-border text-primary' role='status'>
                    <span className='visually-hidden'>Loading...</span>
                  </div>
                </div>
              </>
            )}

            <Button type='submit' className='mt-4 confirm-button w-100'>
              CREATE REPORT
            </Button>
          </Form>
        </Container>
      </Container>
    </>
  );
}

export default ReportCreation;
