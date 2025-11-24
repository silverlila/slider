import { Carousel } from "../lib/carousel";
import MultipleSlides from "./MultipleSlides";

function App() {
  return (
    <div className="App" style={{ width: "100%", overflowX: "hidden" }}>
      <h1 style={{ textAlign: "center", padding: "0 1rem" }}>
        React Carousel Demo
      </h1>

      <section
        style={{
          maxWidth: "600px",
          margin: "2rem auto",
          padding: "0 1rem",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <h2>Single Slide</h2>
        <Carousel slidesToShow={1} gap={2}>
          <Carousel.Track>
            <Carousel.Slide>
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  padding: "3rem",
                  color: "white",
                  borderRadius: "8px",
                  textAlign: "center",
                }}
              >
                Slide 1
              </div>
            </Carousel.Slide>
            <Carousel.Slide>
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                  padding: "3rem",
                  color: "white",
                  borderRadius: "8px",
                  textAlign: "center",
                }}
              >
                Slide 2
              </div>
            </Carousel.Slide>
            <Carousel.Slide>
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                  padding: "3rem",
                  color: "white",
                  borderRadius: "8px",
                  textAlign: "center",
                }}
              >
                Slide 3
              </div>
            </Carousel.Slide>
            <Carousel.Slide>
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                  padding: "3rem",
                  color: "white",
                  borderRadius: "8px",
                  textAlign: "center",
                }}
              >
                Slide 4
              </div>
            </Carousel.Slide>
            <Carousel.Slide>
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
                  padding: "3rem",
                  color: "white",
                  borderRadius: "8px",
                  textAlign: "center",
                }}
              >
                Slide 5
              </div>
            </Carousel.Slide>
            <Carousel.Slide>
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
                  padding: "3rem",
                  color: "white",
                  borderRadius: "8px",
                  textAlign: "center",
                }}
              >
                Slide 6
              </div>
            </Carousel.Slide>
            <Carousel.Slide>
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
                  padding: "3rem",
                  color: "white",
                  borderRadius: "8px",
                  textAlign: "center",
                }}
              >
                Slide 7
              </div>
            </Carousel.Slide>
            <Carousel.Slide>
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
                  padding: "3rem",
                  color: "white",
                  borderRadius: "8px",
                  textAlign: "center",
                }}
              >
                Slide 8
              </div>
            </Carousel.Slide>
            <Carousel.Slide>
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
                  padding: "3rem",
                  color: "white",
                  borderRadius: "8px",
                  textAlign: "center",
                }}
              >
                Slide 9
              </div>
            </Carousel.Slide>
          </Carousel.Track>

          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
            <Carousel.PrevButton />
            <Carousel.NextButton />
          </div>
        </Carousel>
      </section>

      <MultipleSlides />

      {/* Example 3: Custom styled buttons */}
      <section
        style={{
          maxWidth: "600px",
          margin: "2rem auto",
          padding: "0 1rem",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <h2>Custom Styled Buttons</h2>
        <Carousel slidesToShow={2} gap={0.5}>
          <Carousel.Track>
            <Carousel.Slide>
              <div
                style={{
                  background: "#e0e0e0",
                  padding: "2rem",
                  borderRadius: "4px",
                }}
              >
                Product 1
              </div>
            </Carousel.Slide>
            <Carousel.Slide>
              <div
                style={{
                  background: "#e0e0e0",
                  padding: "2rem",
                  borderRadius: "4px",
                }}
              >
                Product 2
              </div>
            </Carousel.Slide>
            <Carousel.Slide>
              <div
                style={{
                  background: "#e0e0e0",
                  padding: "2rem",
                  borderRadius: "4px",
                }}
              >
                Product 3
              </div>
            </Carousel.Slide>
            <Carousel.Slide>
              <div
                style={{
                  background: "#e0e0e0",
                  padding: "2rem",
                  borderRadius: "4px",
                }}
              >
                Product 4
              </div>
            </Carousel.Slide>
          </Carousel.Track>

          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
            <Carousel.PrevButton
              style={{
                background: "#667eea",
                color: "white",
                border: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              ←
            </Carousel.PrevButton>
            <Carousel.NextButton
              style={{
                background: "#667eea",
                color: "white",
                border: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              →
            </Carousel.NextButton>
          </div>
        </Carousel>
      </section>
    </div>
  );
}

export default App;
